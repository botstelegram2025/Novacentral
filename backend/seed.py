"""Seed default data on startup."""
from db import admins, settings, categories, products, message_templates
from models import uid, now_iso
from utils.security import hash_password, sanitize_cpf
from slugify import slugify
import os


async def seed():
    # Default super admin
    admin_cpf = sanitize_cpf(os.environ.get("ADMIN_CPF", "00000000000"))
    if not await admins.find_one({"cpf": admin_cpf}):
        await admins.insert_one({
            "id": uid(),
            "name": os.environ.get("ADMIN_NAME", "Super Admin"),
            "cpf": admin_cpf,
            "password": hash_password(os.environ.get("ADMIN_PASSWORD", "Admin@123")),
            "role": "super_admin",
            "status": "active",
            "created_at": now_iso(),
            "permissions": ["*"],
        })

    # Default settings
    if not await settings.find_one({"key": "main"}):
        await settings.insert_one({
            "key": "main",
            "app_name": os.environ.get("APP_NAME", "Digital Store"),
            "primary_color": "#3b82f6",
            "company_info": {"name": "Digital Store", "email": "contato@digital.store"},
            "social_links": {"instagram": "", "whatsapp": "", "facebook": ""},
            "seo": {
                "meta_title": "Digital Store - Produtos Digitais",
                "meta_description": "Loja de produtos digitais: ativações e créditos.",
                "keywords": ["digital", "loja", "ativação", "créditos"],
            },
            "created_at": now_iso(),
        })

    # Default categories
    if await categories.count_documents({}) == 0:
        base_cats = [
            {"name": "Produtos de Ativação", "kind": "activation", "description": "Códigos e licenças de ativação.", "order": 1},
            {"name": "Produtos de Créditos", "kind": "credits", "description": "Recargas de crédito e saldos.", "order": 2},
        ]
        for c in base_cats:
            c["id"] = uid()
            c["slug"] = slugify(c["name"])
            c["active"] = True
            c["created_at"] = now_iso()
            await categories.insert_one(c)

    # Default templates
    defaults = [
        ("welcome", "whatsapp", None, "Olá {nome}! Sua conta foi criada com sucesso. Bem-vindo(a)!"),
        ("pix_generated", "whatsapp", None, "Olá {nome}, seu PIX do pedido #{pedido} de {valor} foi gerado.\n\nCódigo:\n{pix}"),
        ("payment_approved", "whatsapp", None, "Pagamento aprovado ✔ Pedido #{pedido} - {valor}. Status: {status}"),
        ("order_delivered", "whatsapp", None, "Pedido #{pedido} entregue! Obrigado pela compra, {nome}."),
        ("password_reset", "whatsapp", None, "Olá {nome}, use o token abaixo para redefinir sua senha:\n\n{token}"),
    ]
    for key, ch, subj, body in defaults:
        if not await message_templates.find_one({"key": key, "channel": ch}):
            await message_templates.insert_one({
                "id": uid(), "key": key, "channel": ch, "subject": subj,
                "body": body, "active": True, "created_at": now_iso(),
            })

    # Sample products (2) if none
    if await products.count_documents({}) == 0:
        cats = await categories.find({}, {"_id": 0}).to_list(10)
        act = next((c for c in cats if c["kind"] == "activation"), None)
        cred = next((c for c in cats if c["kind"] == "credits"), None)
        if act:
            pid = uid()
            await products.insert_one({
                "id": pid, "slug": slugify("Ativação IPTV Premium") + "-" + pid[:6],
                "name": "Ativação IPTV Premium 30 dias", "description": "Acesso premium por 30 dias com suporte 24/7.",
                "category_id": act["id"], "image": "https://images.unsplash.com/photo-1638561186238-3227892dbc18?w=600",
                "banner": None, "price": 49.90, "promo_price": 39.90, "sku": "IPTV-30D", "code": "ACT001",
                "stock": 999, "status": "active", "is_featured": True, "is_promo": True, "is_new": True, "is_hidden": False,
                "custom_fields": [
                    {"key": "mac", "label": "MAC", "type": "text", "required": True, "placeholder": "AA:BB:CC:DD:EE:FF"},
                    {"key": "email", "label": "Email", "type": "email", "required": True, "placeholder": ""},
                ],
                "min_qty": 1, "max_qty": 1, "volume_discount": [],
                "sold_count": 0, "rating": 5, "created_at": now_iso(),
            })
        if cred:
            pid = uid()
            await products.insert_one({
                "id": pid, "slug": slugify("Créditos Premium") + "-" + pid[:6],
                "name": "Créditos Premium", "description": "Recarga de créditos para consumo em produtos digitais.",
                "category_id": cred["id"], "image": "https://images.unsplash.com/photo-1780764818910-80526d8aeb6d?w=600",
                "banner": None, "price": 5.00, "promo_price": None, "sku": "CRED-1", "code": "CRED001",
                "stock": 999999, "status": "active", "is_featured": True, "is_promo": False, "is_new": False, "is_hidden": False,
                "custom_fields": [],
                "min_qty": 10, "max_qty": 1000,
                "volume_discount": [{"qty": 50, "discount": 5}, {"qty": 200, "discount": 10}],
                "sold_count": 0, "rating": 5, "created_at": now_iso(),
            })
