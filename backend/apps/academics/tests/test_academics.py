import pytest

from apps.academics.models import CourseAllocation, Semester
from apps.accounts.models import StaffProfile
from apps.results.models import ResultSheet

pytestmark = pytest.mark.django_db


def staff_id_of(user):
    return StaffProfile.objects.get(user=user).pk


def allocate(client, course, lecturer):
    return client.post(
        "/api/allocations/",
        {"course": course.pk, "lecturer": staff_id_of(lecturer)},
        format="json",
    )


def test_allocation_opens_a_draft_result_sheet(world, api):
    response = allocate(api(world.csc_admin), world.courses.csc103, world.csc_lecturer)

    assert response.status_code == 201
    sheet = ResultSheet.objects.get(course=world.courses.csc103, semester=world.semester)
    assert sheet.status == ResultSheet.Status.DRAFT
    assert response.data["result_sheet"] == sheet.pk


def test_allocating_again_reassigns_the_course(world, api):
    response = allocate(api(world.csc_admin), world.courses.csc101, world.other_csc_lecturer)

    assert response.status_code == 201
    allocation = CourseAllocation.objects.get(course=world.courses.csc101, semester=world.semester)
    assert allocation.lecturer.user == world.other_csc_lecturer


def test_lecturer_must_belong_to_the_courses_department(world, api):
    response = allocate(api(world.super_admin), world.courses.csc103, world.mth_lecturer)

    assert response.status_code == 400


def test_dept_admin_cannot_allocate_another_departments_course(world, api):
    response = allocate(api(world.csc_admin), world.courses.mth103, world.mth_lecturer)

    assert response.status_code == 403


def test_lecturer_sees_only_own_allocations(world, api):
    response = api(world.csc_lecturer).get("/api/allocations/")

    assert [row["course_detail"]["code"] for row in response.data["results"]] == ["CSC101"]


def test_dept_admin_cannot_edit_another_departments_course(world, api):
    response = api(world.csc_admin).patch(
        f"/api/courses/{world.courses.mth101.pk}/", {"title": "Changed"}, format="json"
    )

    assert response.status_code == 404


def test_setting_current_semester_moves_the_flag_and_closes_old_registration(world, api):
    response = api(world.super_admin).post(
        f"/api/semesters/{world.second_semester.pk}/set-current/"
    )

    assert response.status_code == 200
    assert list(Semester.objects.filter(is_current=True)) == [world.second_semester]
    world.semester.refresh_from_db()
    assert not world.semester.registration_open


def test_registration_can_only_open_for_current_semester(world, api):
    response = api(world.super_admin).post(
        f"/api/semesters/{world.second_semester.pk}/registration/", {"open": True}, format="json"
    )

    assert response.status_code == 400


def test_deleting_a_department_in_use_is_refused(world, api):
    response = api(world.super_admin).delete(f"/api/departments/{world.csc.pk}/")

    assert response.status_code == 409
