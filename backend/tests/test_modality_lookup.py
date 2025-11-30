from app.services.curriculum.updater import CurriculumUpdater


def test_lookup_modality_accepts_code_only():
    updater = CurriculumUpdater()
    result = updater._lookup_modality_id(34, 2022, "AA")
    assert isinstance(result, int)
    assert result > 0


def test_lookup_modality_accepts_full_label_prefix():
    updater = CurriculumUpdater()
    label_variant = "AA - Sistemas de Computacao"
    result = updater._lookup_modality_id(34, 2022, label_variant)
    assert isinstance(result, int)
    assert result > 0
