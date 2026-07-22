"""
Digital Store backend test suite.

Covers:
- Health/root
- Catalog (categories, products, seeded data)
- Admin auth + admin ops (dashboard, tickets, logs, banners, coupons, promotions)
- User auth (register/login/me), CPF validation
- Orders preview (activation single-only, credits volume discount, mixing rules, coupon)
- Order create (PIX degraded)
- WhatsApp sidecar proxy (start/status/list/templates)
"""
import os
import random
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://digital-marketplace-492.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- Helpers ----------------
def _cpf_check_digits(base9):
    def d(nums, factor_start):
        s = sum(int(n) * f for n, f in zip(nums, range(factor_start, 1, -1)))
        r = (s * 10) % 11
        return 0 if r == 10 else r
    d1 = d(base9, 10)
    d2 = d(base9 + str(d1), 11)
    return f"{base9}{d1}{d2}"


def gen_valid_cpf(seed=None):
    rnd = random.Random(seed) if seed is not None else random.SystemRandom()
    while True:
        base = "".join(str(rnd.randint(0, 9)) for _ in range(9))
        cpf = _cpf_check_digits(base)
        if cpf != cpf[0] * 11:
            return cpf


# Known valid CPF from the request
KNOWN_VALID_CPF = "39053344705"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/auth/login", json={"cpf": "00000000000", "password": "Admin@123"})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("access_token")
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def user_ctx(session):
    """Create/register a fresh user and return tokens+user."""
    cpf = gen_valid_cpf()  # truly random (no shared seed across xdist workers)
    payload = {
        "name": "TEST User",
        "cpf": cpf,
        "ddi": "+55",
        "ddd": "11",
        "phone": f"9{random.randint(10000000,99999999)}",
        "password": "Test@1234",
        "confirm_password": "Test@1234",
        "accept_terms": True,
    }
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["access_token"], "user": data["user"], "cpf": cpf, "password": "Test@1234"}


@pytest.fixture(scope="session")
def user_headers(user_ctx):
    return {"Authorization": f"Bearer {user_ctx['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def catalog(session):
    cats = session.get(f"{API}/catalog/categories").json()
    prods = session.get(f"{API}/catalog/products").json()
    return {"categories": cats, "products": prods}


# ---------------- Health / Root ----------------
class TestHealth:
    def test_api_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        j = r.json()
        assert j["status"] == "ok"

    def test_health(self, session):
        r = session.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_ready(self, session):
        r = session.get(f"{API}/ready")
        assert r.status_code == 200

    def test_live(self, session):
        r = session.get(f"{API}/live")
        assert r.status_code == 200


# ---------------- Catalog Seeding ----------------
class TestCatalogSeed:
    def test_categories_seeded(self, catalog):
        cats = catalog["categories"]
        assert isinstance(cats, list) and len(cats) >= 2
        names = {c["name"] for c in cats}
        assert "Produtos de Ativação" in names
        assert "Produtos de Créditos" in names
        kinds = {c["kind"] for c in cats}
        assert "activation" in kinds and "credits" in kinds

    def test_products_seeded(self, catalog):
        prods = catalog["products"]
        assert isinstance(prods, list) and len(prods) >= 2
        for p in prods:
            assert "category" in p and p["category"] is not None
            assert p["category"].get("kind") in {"activation", "credits"}


# ---------------- Admin Auth ----------------
class TestAdminAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 20

    def test_admin_me(self, session, admin_headers):
        r = session.get(f"{API}/admin/auth/me", headers=admin_headers)
        assert r.status_code == 200
        me = r.json()
        assert me["cpf"] == "00000000000"
        assert me["role"] == "super_admin"
        assert "password" not in me

    def test_admin_login_wrong_password(self, session):
        r = session.post(f"{API}/admin/auth/login", json={"cpf": "00000000000", "password": "wrong"})
        assert r.status_code == 401


# ---------------- User Auth ----------------
class TestUserAuth:
    def test_register_created(self, user_ctx):
        assert user_ctx["user"]["cpf"] == user_ctx["cpf"]
        assert user_ctx["token"]

    def test_register_invalid_cpf(self, session):
        r = session.post(f"{API}/auth/register", json={
            "name": "TEST", "cpf": "12345678900", "ddi": "+55", "ddd": "11", "phone": "999998888",
            "password": "Test@1234", "confirm_password": "Test@1234", "accept_terms": True,
        })
        assert r.status_code == 400
        assert "CPF" in r.json().get("detail", "")

    def test_register_duplicate_cpf(self, session, user_ctx):
        r = session.post(f"{API}/auth/register", json={
            "name": "TEST Dup", "cpf": user_ctx["cpf"], "ddi": "+55", "ddd": "11",
            "phone": f"9{random.randint(10000000,99999999)}",
            "password": "Test@1234", "confirm_password": "Test@1234", "accept_terms": True,
        })
        assert r.status_code == 409

    def test_login(self, session, user_ctx):
        r = session.post(f"{API}/auth/login", json={"cpf": user_ctx["cpf"], "password": user_ctx["password"]})
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"]

    def test_login_bad_password(self, session, user_ctx):
        r = session.post(f"{API}/auth/login", json={"cpf": user_ctx["cpf"], "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, session, user_headers, user_ctx):
        r = session.get(f"{API}/auth/me", headers=user_headers)
        assert r.status_code == 200
        me = r.json()
        assert me["cpf"] == user_ctx["cpf"]
        assert "password" not in me


# ---------------- Orders Preview ----------------
class TestOrdersPreview:
    def _find(self, catalog, kind):
        for p in catalog["products"]:
            if p["category"]["kind"] == kind:
                return p
        return None

    def test_activation_single(self, session, user_headers, catalog):
        p = self._find(catalog, "activation")
        assert p is not None
        # Fill required custom fields
        custom = {cf["key"]: "test" for cf in p.get("custom_fields", [])}
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": p["id"], "quantity": 1, "custom_data": custom}]
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] > 0
        assert d["subtotal"] > 0
        assert len(d["items"]) == 1
        assert d["items"][0]["kind"] == "activation"

    def test_activation_missing_custom_field(self, session, user_headers, catalog):
        p = self._find(catalog, "activation")
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": p["id"], "quantity": 1, "custom_data": {}}]
        })
        # if there are required fields, expect 400
        if any(cf.get("required") for cf in p.get("custom_fields", [])):
            assert r.status_code == 400

    def test_two_activation_products_rejected(self, session, user_headers, catalog):
        # Add duplicate activation product with two entries - triggers "Apenas 1 Produto de Ativação"
        p = self._find(catalog, "activation")
        custom = {cf["key"]: "test" for cf in p.get("custom_fields", [])}
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [
                {"product_id": p["id"], "quantity": 1, "custom_data": custom},
                {"product_id": p["id"], "quantity": 1, "custom_data": custom},
            ]
        })
        assert r.status_code == 400

    def test_mixing_rejected(self, session, user_headers, catalog):
        act = self._find(catalog, "activation")
        cred = self._find(catalog, "credits")
        custom = {cf["key"]: "test" for cf in act.get("custom_fields", [])}
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [
                {"product_id": act["id"], "quantity": 1, "custom_data": custom},
                {"product_id": cred["id"], "quantity": 10, "custom_data": {}},
            ]
        })
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "misturar" in detail.lower()

    def test_credits_volume_discount(self, session, user_headers, catalog):
        p = self._find(catalog, "credits")
        # qty 200 => 10% discount tier
        qty = 200
        base = p.get("promo_price") or p["price"]
        expected_unit = round(base * 0.9, 2)
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": p["id"], "quantity": qty}]
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["items"][0]["unit_price"] == expected_unit
        assert d["total"] == round(expected_unit * qty, 2)

    def test_credits_qty_out_of_range(self, session, user_headers, catalog):
        p = self._find(catalog, "credits")
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": p["id"], "quantity": 1}]  # min_qty=10
        })
        assert r.status_code == 400


# ---------------- Coupons + Preview ----------------
class TestCouponsAndPreview:
    def test_create_coupon(self, session, admin_headers, catalog):
        code = f"TEST{int(time.time())}"
        r = session.post(f"{API}/marketing/coupons", headers=admin_headers, json={
            "code": code, "type": "percent", "value": 10, "scope": "global",
            "min_order": 0, "active": True,
        })
        assert r.status_code == 200, r.text
        pytest.coupon_code = code

    def test_list_coupons(self, session, admin_headers):
        r = session.get(f"{API}/marketing/coupons", headers=admin_headers)
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()}
        assert pytest.coupon_code in codes

    def test_preview_with_valid_coupon(self, session, user_headers, catalog):
        # Use credits product with qty=10 (no volume discount tier)
        cred = next((p for p in catalog["products"] if p["category"]["kind"] == "credits"), None)
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": cred["id"], "quantity": 10}],
            "coupon_code": pytest.coupon_code,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["discount"] > 0
        assert d["coupon"]["code"] == pytest.coupon_code

    def test_preview_with_invalid_coupon(self, session, user_headers, catalog):
        cred = next((p for p in catalog["products"] if p["category"]["kind"] == "credits"), None)
        r = session.post(f"{API}/orders/preview", headers=user_headers, json={
            "items": [{"product_id": cred["id"], "quantity": 10}],
            "coupon_code": "NOPE_INVALID_XYZ",
        })
        assert r.status_code == 400


# ---------------- Order Create (PIX degraded) ----------------
class TestOrderCreate:
    def test_create_credits_order_pix_null(self, session, user_headers, catalog):
        cred = next((p for p in catalog["products"] if p["category"]["kind"] == "credits"), None)
        r = session.post(f"{API}/orders/create", headers=user_headers, json={
            "items": [{"product_id": cred["id"], "quantity": 10}]
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        # MERCADOPAGO_ACCESS_TOKEN empty => degraded
        assert d.get("pix_qr_code") is None
        assert d.get("mp_payment_id") is None
        pytest.order_id = d["id"]

    def test_list_my_orders(self, session, user_headers):
        r = session.get(f"{API}/orders/mine", headers=user_headers)
        assert r.status_code == 200
        ids = {o["id"] for o in r.json()}
        assert pytest.order_id in ids


# ---------------- Admin Dashboard ----------------
class TestAdminDashboard:
    def test_dashboard_kpis(self, session, admin_headers):
        r = session.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "total_users" in d
        assert isinstance(d["chart"], list) and len(d["chart"]) == 14
        assert "revenue" in d
        for k in ("day", "week", "month", "year"):
            assert k in d["revenue"]

    def test_admin_dashboard_requires_admin(self, session, user_headers):
        r = session.get(f"{API}/admin/dashboard", headers=user_headers)
        assert r.status_code in (401, 403)


# ---------------- Admin Catalog CRUD ----------------
class TestAdminCatalog:
    def test_create_category(self, session, admin_headers):
        name = f"TEST Cat {uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/catalog/categories", headers=admin_headers, json={
            "name": name, "kind": "activation", "description": "TEST", "order": 99, "active": True,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == name and d["kind"] == "activation"
        pytest.test_cat_id = d["id"]

    def test_create_product(self, session, admin_headers):
        r = session.post(f"{API}/catalog/products", headers=admin_headers, json={
            "name": f"TEST Product {uuid.uuid4().hex[:6]}",
            "description": "TEST",
            "category_id": pytest.test_cat_id,
            "price": 10.0,
            "custom_fields": [{"key": "mac", "label": "MAC", "type": "text", "required": True}],
            "min_qty": 1, "max_qty": 1,
            "volume_discount": [{"qty": 5, "discount": 10}],
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["price"] == 10.0
        assert len(d["custom_fields"]) == 1


# ---------------- WhatsApp ----------------
class TestWhatsApp:
    def test_start_session(self, session, admin_headers):
        r = session.post(f"{API}/whatsapp/sessions/start", headers=admin_headers, json={
            "session_id": "test1", "label": "TEST session",
        })
        # sidecar might be up (200) or unavailable (502) — DB record must exist regardless
        assert r.status_code in (200, 502), r.text

    def test_session_status(self, session, admin_headers):
        # allow sidecar time to produce QR
        time.sleep(2)
        r = session.get(f"{API}/whatsapp/sessions/test1/status", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        # keys: connected, qr present (may be null)
        assert "connected" in d
        assert d["connected"] in (True, False)

    def test_list_sessions_has_test1(self, session, admin_headers):
        r = session.get(f"{API}/whatsapp/sessions", headers=admin_headers)
        assert r.status_code == 200
        sids = {s["session_id"] for s in r.json()}
        assert "test1" in sids

    def test_templates_default(self, session, admin_headers):
        r = session.get(f"{API}/whatsapp/templates", headers=admin_headers)
        assert r.status_code == 200
        keys = {t["key"] for t in r.json()}
        for expected in {"welcome", "pix_generated", "payment_approved", "order_delivered", "password_reset"}:
            assert expected in keys, f"template missing: {expected}"


# ---------------- Tickets ----------------
class TestTickets:
    def test_user_create_ticket(self, session, user_headers):
        r = session.post(f"{API}/tickets", headers=user_headers, json={
            "subject": "TEST Ticket", "message": "TEST message",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "open"
        pytest.ticket_id = d["id"]

    def test_admin_list_tickets(self, session, admin_headers):
        r = session.get(f"{API}/admin/tickets", headers=admin_headers)
        assert r.status_code == 200
        ids = {t["id"] for t in r.json()}
        assert pytest.ticket_id in ids


# ---------------- Logs ----------------
class TestLogs:
    def test_admin_logs(self, session, admin_headers):
        r = session.get(f"{API}/admin/logs", headers=admin_headers)
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        # We've triggered register, admin_login at least
        kinds = {l["kind"] for l in logs}
        assert "admin_login" in kinds or "register" in kinds


# ---------------- Marketing (promotions + banners) ----------------
class TestMarketingBP:
    def test_list_promotions_active(self, session):
        r = session.get(f"{API}/marketing/promotions?active_only=true")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_banner(self, session, admin_headers):
        r = session.post(f"{API}/marketing/banners", headers=admin_headers, json={
            "title": "TEST Banner", "subtitle": "TEST", "image": "https://example.com/x.png",
            "type": "main", "order": 1, "active": True,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST Banner"
