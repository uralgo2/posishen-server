DELIMITER //
use pozishen//
DROP TRIGGER IF EXISTS add_query_count//
DROP TRIGGER IF EXISTS delete_query_count//
DROP TRIGGER IF EXISTS add_queries_count//
DROP TRIGGER IF EXISTS delete_queries_count//
DROP TRIGGER IF EXISTS update_online//
DROP TRIGGER IF EXISTS check_tasks//
CREATE TRIGGER add_query_count AFTER INSERT ON queries
    FOR EACH ROW BEGIN
        UPDATE _groups SET queriesCount = queriesCount + 1 WHERE id = NEW.groupId;
END//
CREATE TRIGGER delete_query_count AFTER DELETE ON queries
    FOR EACH ROW BEGIN
    UPDATE _groups SET queriesCount = queriesCount - 1 WHERE id = OLD.groupId;
END//

CREATE TRIGGER add_queries_count AFTER UPDATE ON _groups
    FOR EACH ROW BEGIN
    UPDATE projects SET queriesCount = queriesCount + 1 WHERE id = NEW.projectId;
END//

CREATE TRIGGER delete_queries_count AFTER DELETE ON _groups
    FOR EACH ROW BEGIN
    UPDATE projects SET queriesCount = queriesCount - OLD.queriesCount WHERE id = OLD.projectId;
END//

CREATE TRIGGER update_online AFTER UPDATE ON users
    FOR EACH ROW BEGIN
        UPDATE tasks SET userOnline = NEW.online WHERE userId = NEW.id;
END//

CREATE TRIGGER check_tasks AFTER DELETE ON tasks
    FOR EACH ROW BEGIN
    IF (SELECT COUNT(*) FROM tasks WHERE projectId = OLD.projectId) = 0 THEN
        UPDATE projects SET collected = TRUE WHERE id = OLD.projectId;
    END IF;
END//