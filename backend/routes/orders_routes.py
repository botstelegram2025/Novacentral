from fastapi import APIRouter, HTTPException, Depends, Request, Header
from typing import Optional
from models import CreateOrderInput, uid, now_iso
from db import orders, products, categories, coupons, users, payments
from auth import get_current_user
from services.pix import create_pix_payment, get_payment_status, is_configured
from services.notifier import log_event, push_notification, send_whatsapp_to_user
import os

router = APIRouter(prefix="/orders", tags=["orders"])


def _apply_volume_discount(price: float, qty: int, tiers: list) -> float:
    best = 0
    for t in tiers or []:
        if qty >= int(t.get("qty", 0)):
            best = max(best, float(t.get("discount", 0)))
    return price * (1 - best / 100)


async def _compute_totals(items_input, coupon_code, user):
    if not items_input:
        raise HTTPException(400, "Carrinho vazio")
    # Fetch products
    ids = [i.product_id for i in items_input]
    prods = {p["id"]: p for p in await products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))}
    if len(prods) != len(set(ids)):
        raise HTTPException(400, "Produto inexistente no carrinho")
    cats = {c["id"]: c for c in await categories.find({}, {"_id": 0}).to_list(1000)}

    # Validate mixing rules
    kinds = set()
    for i in items_input:
        p = prods[i.product_id]
        c = cats.get(p.get("category_id"))
        if not c:
            raise HTTPException(400, "Categoria do produto ausente")
        kinds.add(c["kind"])
    if "activation" in kinds and "credits" in kinds:
        raise HTTPException(400, "Não é possível misturar Produtos de Ativação com Produtos de Créditos")
    # Activation: only 1 unit, and only single distinct product
    if "activation" in kinds:
        if len(items_input) > 1:
            raise HTTPException(400, "Apenas 1 Produto de Ativação por pedido")
        if items_input[0].quantity != 1:
            raise HTTPException(400, "Produto de Ativação: quantidade deve ser 1")

    order_items = []
    subtotal = 0.0
    for i in items_input:
        p = prods[i.product_id]
        c = cats[p["category_id"]]
        base_price = p.get("promo_price") or p["price"]
        if c["kind"] == "credits":
            if i.quantity < p.get("min_qty", 1) or i.quantity > max(p.get("max_qty", 999), p.get("min_qty", 1)):
                raise HTTPException(400, f"Quantidade fora do intervalo para {p['name']}")
            unit_price = _apply_volume_discount(base_price, i.quantity, p.get("volume_discount", []))
        else:
            unit_price = base_price
            # validate required custom fields
            for cf in p.get("custom_fields", []):
                if cf.get("required") and not (i.custom_data or {}).get(cf["key"]):
                    raise HTTPException(400, f"Campo obrigatório: {cf['label']}")
        line = round(unit_price * i.quantity, 2)
        subtotal += line
        order_items.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": p.get("image"),
            "sku": p.get("sku"),
            "kind": c["kind"],
            "unit_price": round(unit_price, 2),
            "quantity": i.quantity,
            "line_total": line,
            "custom_data": i.custom_data or {},
        })

    discount = 0.0
    coupon_info = None
    if coupon_code:
        coup = await coupons.find_one({"code": coupon_code.upper(), "active": True}, {"_id": 0})
        if not coup:
            raise HTTPException(400, "Cupom inválido")
        if coup.get("max_uses") is not None and coup.get("used_count", 0) >= coup["max_uses"]:
            raise HTTPException(400, "Cupom esgotado")
        if coup.get("scope") == "first_purchase" and user:
            has = await orders.find_one({"user_id": user["id"], "status": {"$in": ["paid", "completed"]}})
            if has:
                raise HTTPException(400, "Cupom válido apenas para primeira compra")
        if subtotal < coup.get("min_order", 0):
            raise HTTPException(400, "Valor mínimo do pedido não atingido")
        if coup["type"] == "percent":
            discount = subtotal * (float(coup["value"]) / 100)
        else:
            discount = float(coup["value"])
        discount = round(min(discount, subtotal), 2)
        coupon_info = {"code": coup["code"], "value": discount}

    total = round(subtotal - discount, 2)
    return order_items, round(subtotal, 2), discount, total, coupon_info


@router.post("/preview")
async def preview_order(inp: CreateOrderInput, user=Depends(get_current_user)):
    items, subtotal, discount, total, coupon = await _compute_totals(inp.items, inp.coupon_code, user)
    return {"items": items, "subtotal": subtotal, "discount": discount, "total": total, "coupon": coupon}


@router.post("/create")
async def create_order(inp: CreateOrderInput, request: Request, user=Depends(get_current_user)):
    items, subtotal, discount, total, coupon = await _compute_totals(inp.items, inp.coupon_code, user)
    if total <= 0:
        raise HTTPException(400, "Total inválido")

    order_id = uid()
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_snapshot": {"name": user["name"], "cpf": user["cpf"], "phone": f"{user['ddi']}{user['ddd']}{user['phone']}", "email": user.get("email")},
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "coupon": coupon,
        "status": "pending",
        "payment_method": "pix",
        "mp_payment_id": None,
        "pix_qr_code": None,
        "pix_qr_base64": None,
        "created_at": now_iso(),
        "delivery": None,
    }
    await orders.insert_one(order_doc)

    # Try to create PIX
    if is_configured():
        try:
            desc = f"Pedido {order_id[:8]} - " + ", ".join([i["name"] for i in items])[:200]
            pix = create_pix_payment(total, desc, user.get("email") or f"user{user['id']}@example.com",
                                     user["cpf"], user["name"], order_id)
            await orders.update_one({"id": order_id}, {"$set": {
                "mp_payment_id": pix["payment_id"],
                "pix_qr_code": pix["qr_code"],
                "pix_qr_base64": pix["qr_code_base64"],
            }})
            await payments.insert_one({
                "id": uid(), "order_id": order_id, "user_id": user["id"],
                "provider": "mercadopago", "provider_payment_id": pix["payment_id"],
                "amount": total, "status": pix["status"], "created_at": now_iso(),
            })
            order_doc["mp_payment_id"] = pix["payment_id"]
            order_doc["pix_qr_code"] = pix["qr_code"]
            order_doc["pix_qr_base64"] = pix["qr_code_base64"]
            await send_whatsapp_to_user(user["id"], "pix_generated", {
                "nome": user["name"], "pedido": order_id[:8], "valor": f"R$ {total:.2f}", "pix": pix["qr_code"] or ""
            })
        except Exception as e:
            await log_event("pix_error", str(e), {"order_id": order_id})
    if coupon:
        await coupons.update_one({"code": coupon["code"]}, {"$inc": {"used_count": 1}})

    await log_event("order_created", f"Pedido {order_id[:8]} R$ {total:.2f}", {"order_id": order_id, "user_id": user["id"]})
    await push_notification(user["id"], "Pedido criado", f"Seu pedido #{order_id[:8]} está aguardando pagamento.", "info", f"/painel/pedidos/{order_id}")
    return {k: v for k, v in order_doc.items() if k != "_id"}


@router.get("/mine")
async def my_orders(user=Depends(get_current_user)):
    docs = await orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.get("/{oid}")
async def get_order(oid: str, user=Depends(get_current_user)):
    d = await orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Pedido não encontrado")
    return d


@router.post("/{oid}/check-payment")
async def check_payment(oid: str, user=Depends(get_current_user)):
    d = await orders.find_one({"id": oid, "user_id": user["id"]}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Pedido não encontrado")
    if not d.get("mp_payment_id"):
        return {"status": d["status"]}
    try:
        info = get_payment_status(d["mp_payment_id"])
    except Exception as e:
        raise HTTPException(500, f"Falha consultando MP: {e}")
    new_status = d["status"]
    if info["status"] == "approved" and d["status"] == "pending":
        new_status = "paid"
        await _finalize_paid(d)
    elif info["status"] in ("cancelled", "rejected", "refunded") and d["status"] == "pending":
        new_status = "cancelled"
        await orders.update_one({"id": oid}, {"$set": {"status": new_status, "cancelled_at": now_iso()}})
    return {"status": new_status, "mp_status": info["status"]}


async def _finalize_paid(order_doc):
    oid = order_doc["id"]
    await orders.update_one({"id": oid}, {"$set": {
        "status": "paid",
        "paid_at": now_iso(),
        "delivery": {"delivered_at": now_iso(), "by": "system"},
    }})
    # increment sold_count
    for it in order_doc["items"]:
        await products.update_one({"id": it["product_id"]}, {"$inc": {"sold_count": it["quantity"]}})
    await push_notification(order_doc["user_id"], "Pagamento aprovado!", f"Pedido #{oid[:8]} confirmado.", "success", f"/painel/pedidos/{oid}")
    await send_whatsapp_to_user(order_doc["user_id"], "payment_approved", {
        "nome": order_doc["user_snapshot"]["name"], "pedido": oid[:8], "valor": f"R$ {order_doc['total']:.2f}", "status": "aprovado"
    })
    await log_event("order_paid", f"Pedido {oid[:8]} pago", {"order_id": oid})


@router.post("/webhook/mercadopago")
async def mp_webhook(request: Request, x_signature: Optional[str] = Header(None)):
    body = await request.json()
    await log_event("mp_webhook", "webhook recebido", {"body": body})
    if body.get("type") == "payment":
        pid = str(body.get("data", {}).get("id", ""))
        if pid:
            try:
                info = get_payment_status(pid)
            except Exception:
                return {"ok": True}
            order = await orders.find_one({"mp_payment_id": pid}, {"_id": 0})
            if order and info["status"] == "approved" and order["status"] == "pending":
                await _finalize_paid(order)
            elif order and info["status"] in ("cancelled", "rejected") and order["status"] == "pending":
                await orders.update_one({"id": order["id"]}, {"$set": {"status": "cancelled", "cancelled_at": now_iso()}})
    return {"ok": True}
