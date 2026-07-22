from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
import uuid


def uid() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============ AUTH ============
class RegisterInput(BaseModel):
    name: str
    cpf: str
    ddi: str = "+55"
    ddd: str
    phone: str
    email: Optional[str] = None
    password: str
    confirm_password: str
    accept_terms: bool = True


class LoginInput(BaseModel):
    cpf: str
    password: str
    remember: bool = False


class AdminLoginInput(BaseModel):
    cpf: str
    password: str


class ForgotPasswordInput(BaseModel):
    cpf: str
    method: str = "whatsapp"  # whatsapp | email


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ============ USERS ============
class UserPublic(BaseModel):
    id: str
    name: str
    cpf: str
    email: Optional[str] = None
    ddi: str
    ddd: str
    phone: str
    avatar: Optional[str] = None
    status: str = "active"
    created_at: str
    last_login: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    ddi: Optional[str] = None
    ddd: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


# ============ CATEGORIES ============
class CategoryInput(BaseModel):
    name: str
    kind: str  # "activation" | "credits"
    description: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0
    active: bool = True


# ============ PRODUCTS ============
class CustomField(BaseModel):
    key: str  # MAC, Email, Senha, Login, Chave, Serial, Codigo, Token, Licenca, Observacoes, Numero
    label: str
    type: str = "text"  # text | email | password | textarea | number
    required: bool = True
    placeholder: Optional[str] = None


class ProductInput(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    image: Optional[str] = None
    banner: Optional[str] = None
    price: float
    promo_price: Optional[float] = None
    sku: Optional[str] = None
    code: Optional[str] = None
    stock: int = 999
    status: str = "active"  # active | inactive | hidden | archived
    is_featured: bool = False
    is_promo: bool = False
    is_new: bool = False
    is_hidden: bool = False
    custom_fields: List[CustomField] = []
    # Credit product config
    min_qty: int = 1
    max_qty: int = 1
    volume_discount: List[Dict[str, Any]] = []  # [{qty:10, discount: 5}]
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: List[str] = []


# ============ CART ============
class CartItemInput(BaseModel):
    product_id: str
    quantity: int = 1
    custom_data: Dict[str, Any] = {}


class CartInput(BaseModel):
    items: List[CartItemInput]
    coupon_code: Optional[str] = None


# ============ ORDERS ============
class CreateOrderInput(BaseModel):
    items: List[CartItemInput]
    coupon_code: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


# ============ COUPONS ============
class CouponInput(BaseModel):
    code: str
    type: str  # percent | fixed
    value: float
    scope: str = "global"  # global | first_purchase | category | product | user
    scope_ref: Optional[str] = None  # category_id / product_id / user_id
    min_order: float = 0
    max_uses: Optional[int] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    active: bool = True


# ============ PROMOTIONS ============
class PromotionInput(BaseModel):
    name: str
    description: Optional[str] = None
    banner: Optional[str] = None
    product_ids: List[str] = []
    old_value: Optional[float] = None
    new_value: Optional[float] = None
    color: Optional[str] = "#3b82f6"
    start_at: str
    end_at: str
    active: bool = True


# ============ BANNERS ============
class BannerInput(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: str
    link: Optional[str] = None
    type: str = "main"  # main | promo | side | popup | slider
    order: int = 0
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    active: bool = True


# ============ SETTINGS ============
class SettingsInput(BaseModel):
    app_name: Optional[str] = None
    logo: Optional[str] = None
    favicon: Optional[str] = None
    primary_color: Optional[str] = None
    company_info: Optional[Dict[str, Any]] = None
    social_links: Optional[Dict[str, str]] = None
    seo: Optional[Dict[str, Any]] = None
    mp_public_key: Optional[str] = None
    smtp: Optional[Dict[str, str]] = None
    webhook_url: Optional[str] = None


# ============ TICKETS ============
class TicketInput(BaseModel):
    subject: str
    message: str


class TicketReplyInput(BaseModel):
    message: str


# ============ WHATSAPP ============
class WhatsappSessionInput(BaseModel):
    session_id: str
    label: Optional[str] = None


class WhatsappSendInput(BaseModel):
    session_id: str
    to: str  # phone number
    text: str


class TemplateInput(BaseModel):
    key: str  # welcome, pix_generated, payment_approved, etc.
    channel: str = "whatsapp"  # whatsapp | email
    subject: Optional[str] = None
    body: str
    active: bool = True


# ============ NOTIFICATIONS ============
class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    title: str
    message: str
    type: str = "info"  # info | success | warning | error
    link: Optional[str] = None
