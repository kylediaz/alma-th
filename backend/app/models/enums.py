import enum


class AccountType(str, enum.Enum):
    ATTORNEY = "ATTORNEY"


class LeadStatus(str, enum.Enum):
    PENDING = "PENDING"
    REACHED_OUT = "REACHED_OUT"


class EmailOutboxKind(str, enum.Enum):
    PROSPECT_CONFIRMATION = "PROSPECT_CONFIRMATION"
    ATTORNEY_NEW_LEAD = "ATTORNEY_NEW_LEAD"


class EmailOutboxStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
