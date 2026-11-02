from decimal import Decimal

import pytest

from apps.results.grading import calculate_gpa, grade_for


@pytest.mark.parametrize(
    ("total", "expected"),
    [
        (100, ("A", 5)),
        (70, ("A", 5)),
        (69, ("B", 4)),
        (60, ("B", 4)),
        (59, ("C", 3)),
        (50, ("C", 3)),
        (49, ("D", 2)),
        (45, ("D", 2)),
        (44, ("E", 1)),
        (40, ("E", 1)),
        (39, ("F", 0)),
        (0, ("F", 0)),
    ],
)
def test_grade_band_boundaries(total, expected):
    assert grade_for(total) == expected


def test_gpa_is_weighted_by_course_units():
    # 3 units of A (5) and 1 unit of F (0): (15 + 0) / 4
    assert calculate_gpa([(3, 5), (1, 0)]) == Decimal("3.75")


def test_gpa_rounds_half_up_to_two_places():
    # (3*5 + 3*4 + 3*4) / 9 = 4.333...
    assert calculate_gpa([(3, 5), (3, 4), (3, 4)]) == Decimal("4.33")
    # (2*5 + 1*4) / 3 = 4.666...
    assert calculate_gpa([(2, 5), (1, 4)]) == Decimal("4.67")


def test_gpa_with_no_results_is_zero():
    assert calculate_gpa([]) == Decimal("0.00")
