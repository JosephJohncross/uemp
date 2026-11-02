from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings


def grade_for(total: int) -> tuple[str, int]:
    for minimum, grade, point in settings.GRADING_SCALE:
        if total >= minimum:
            return grade, point
    raise ValueError(f"No grade band covers a total of {total}.")


def calculate_gpa(results: Iterable[tuple[int, int]]) -> Decimal:
    """Credit-unit-weighted average of (units, grade_point) pairs, to two decimal places."""
    total_units = 0
    weighted_points = 0
    for units, grade_point in results:
        total_units += units
        weighted_points += units * grade_point
    if total_units == 0:
        return Decimal("0.00")
    return (Decimal(weighted_points) / Decimal(total_units)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
