import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

# Collections
users = db.users
admins = db.admins
products = db.products
categories = db.categories
orders = db.orders
payments = db.payments
coupons = db.coupons
promotions = db.promotions
banners = db.banners
notifications = db.notifications
settings = db.settings
logs = db.logs
audit_logs = db.audit_logs
tickets = db.tickets
whatsapp_sessions = db.whatsapp_sessions
password_resets = db.password_resets
favorites = db.favorites
message_templates = db.message_templates


async def ensure_indexes():
    await users.create_index("cpf", unique=True)
    await users.create_index("phone")
    await admins.create_index("cpf", unique=True)
    await products.create_index("slug", unique=True)
    await products.create_index("category_id")
    await orders.create_index("user_id")
    await orders.create_index("status")
    await orders.create_index("mp_payment_id")
    await coupons.create_index("code", unique=True)
    await notifications.create_index("user_id")
    await logs.create_index("created_at")
