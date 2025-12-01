STATUS_COLORS = {
    "completed": "#55CC55",
    "eligible_and_offered": "#FFFF66",
    "eligible_not_offered": "#DDDDDD",
    "not_eligible": "#FF6666",
}

def color_for_status(status: str) -> str:
    return STATUS_COLORS.get(status, "#CCCCCC")
