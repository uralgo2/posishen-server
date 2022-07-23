DELIMITER //
use pozishen//
DROP TRIGGER IF EXISTS add_query_count//
DROP TRIGGER IF EXISTS delete_query_count//
DROP TRIGGER IF EXISTS add_queries_count//
DROP TRIGGER IF EXISTS delete_queries_count//
DROP TRIGGER IF EXISTS update_online//
DROP TRIGGER IF EXISTS check_tasks//
CREATE TRIGGER add_query_count AFTER INSERT ON queries -- инкрементируем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN
        IF NEW.subgroupId != 0 THEN
            UPDATE subgroups SET queriesCount = queriesCount + 1 WHERE id = NEW.subgroupId;
        END IF;
        UPDATE _groups SET queriesCount = queriesCount + 1 WHERE id = NEW.groupId;
END//
CREATE TRIGGER delete_query_count AFTER DELETE ON queries -- декрементируем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN
    IF OLD.subgroupId != 0 THEN
        UPDATE subgroups SET queriesCount = queriesCount + 1 WHERE id = OLD.subgroupId;
    END IF;
    UPDATE _groups SET queriesCount = queriesCount - 1 WHERE id = OLD.groupId;
END//

CREATE TRIGGER add_queries_count AFTER UPDATE ON _groups -- инкрементируем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN

    UPDATE projects SET queriesCount = queriesCount + 1 WHERE id = NEW.projectId;
END//

CREATE TRIGGER delete_queries_count AFTER DELETE ON _groups -- уменьшаем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN
    UPDATE projects SET queriesCount = queriesCount - OLD.queriesCount WHERE id = OLD.projectId;
END//

CREATE TRIGGER update_online AFTER UPDATE ON users -- изменяем запущена ли программа пользователя при изменении его статуса
    FOR EACH ROW BEGIN
        UPDATE tasks SET userOnline = NEW.online WHERE userId = NEW.id;
END//

CREATE TRIGGER check_tasks AFTER DELETE ON tasks -- если задач с таким айди проекта больше нет то устанавливаем флаг сбора в истину
    FOR EACH ROW BEGIN
    IF (SELECT COUNT(*) FROM tasks WHERE projectId = OLD.projectId) = 0 THEN
        UPDATE projects SET collected = TRUE WHERE id = OLD.projectId;
    END IF;
END//

CREATE TRIGGER add_queries_count_subgroup AFTER UPDATE ON subgroups -- инкрементируем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN

    UPDATE _groups SET queriesCount = queriesCount + 1 WHERE id = NEW.groupId;
END//

CREATE TRIGGER delete_queries_count_subgroup AFTER DELETE ON subgroups -- уменьшаем колличество запросов при добавлении нового запроса
    FOR EACH ROW BEGIN
    UPDATE _groups SET queriesCount = queriesCount - OLD.queriesCount WHERE id = OLD.groupId;
END//