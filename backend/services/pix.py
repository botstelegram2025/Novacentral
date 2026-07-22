import os
import mercadopago
from typing import Optional, Dict, Any

_sdk = None


def get_sdk() -> Optional[mercadopago.SDK]:
    global _sdk
    token = os.environ.get("MERCADOPAGO_ACCESS_TOKEN", "").strip()
    if not token:
        return None
    if _sdk is None:
        _sdk = mercadopago.SDK(token)
    return _sdk


def is_configured() -> bool:
    return bool(os.environ.get("MERCADOPAGO_ACCESS_TOKEN", "").strip())


def create_pix_payment(amount: float, description: str, payer_email: str, payer_cpf: str, payer_name: str, external_reference: str) -> Dict[str, Any]:
    sdk = get_sdk()
    if not sdk:
        raise RuntimeError("Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN.")
    first, *rest = (payer_name or "Cliente").split(" ", 1)
    payment_data = {
        "transaction_amount": round(float(amount), 2),
        "description": description[:250],
        "payment_method_id": "pix",
        "external_reference": external_reference,
        "payer": {
            "email": payer_email or "cliente@example.com",
            "first_name": first,
            "last_name": rest[0] if rest else "-",
            "identification": {"type": "CPF", "number": payer_cpf},
        },
    }
    result = sdk.payment().create(payment_data)
    resp = result.get("response", {})
    if "id" not in resp:
        raise RuntimeError(f"Falha ao gerar PIX: {resp}")
    poi = resp.get("point_of_interaction", {}).get("transaction_data", {})
    return {
        "payment_id": str(resp["id"]),
        "status": resp.get("status", "pending"),
        "qr_code": poi.get("qr_code"),
        "qr_code_base64": poi.get("qr_code_base64"),
        "ticket_url": poi.get("ticket_url"),
        "raw": resp,
    }


def get_payment_status(payment_id: str) -> Dict[str, Any]:
    sdk = get_sdk()
    if not sdk:
        raise RuntimeError("Mercado Pago não configurado.")
    result = sdk.payment().get(payment_id)
    resp = result.get("response", {})
    return {
        "payment_id": str(resp.get("id", payment_id)),
        "status": resp.get("status", "pending"),
        "status_detail": resp.get("status_detail"),
        "external_reference": resp.get("external_reference"),
    }
