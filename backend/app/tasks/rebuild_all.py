from app.services.curriculum.updater import CurriculumUpdater

def rebuild_all_for_user(user_id: str):
    updater = CurriculumUpdater()
    updater.rebuild_all_for_user(user_id)
