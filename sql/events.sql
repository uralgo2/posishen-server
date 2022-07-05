use test;

delimiter |

CREATE EVENT e_daily
    ON SCHEDULE
        EVERY 1 DAY
    DO
BEGIN
UPDATE users SET executedTasksForWeek = executedTasksForWeek + executedTasksForDay,
                 executedTasksForDay = 0;

END |

CREATE EVENT e_weekly
    ON SCHEDULE
        EVERY 1 WEEK
    DO
BEGIN
UPDATE users SET executedTasksForMonth = executedTasksForMonth + executedTasksForWeek,
                 executedTasksForWeek = 0;

END |

CREATE EVENT e_monthly
    ON SCHEDULE
        EVERY 1 DAY
    DO
BEGIN
UPDATE users SET executedTasksForMonth = 0;

END |

CREATE EVENT event_task_create
    ON SCHEDULE
    EVERY 1 DAY
    DO
    BEGIN
        DECLARE n INT DEFAULT 0;
        DECLARE i INT DEFAULT 0;
        DECLARE j INT DEFAULT 0;
        DECLARE k INT DEFAULT 0;
        DECLARE m INT DEFAULT 0;
        DECLARE jn INT DEFAULT 0;
        DECLARE kn INT DEFAULT 0;
        DECLARE mn INT DEFAULT 0;
        DECLARE _projectId INT DEFAULT 0;
        DECLARE _groupId INT DEFAULT 0;
        DECLARE _queryId INT DEFAULT 0;
        DECLARE _cityName VARCHAR(255);
        DECLARE _searchingRange ENUM('100', '200');
        DECLARE _parsingTime TIME;
        DECLARE _queryText VARCHAR(255);
        DECLARE _siteAddress VARCHAR(255);

        SELECT COUNT(*) FROM projects INTO n;
        SET i=0;

        WHILE i<n DO
            SELECT id FROM projects LIMIT i, 1 INTO _projectId;

            IF FIND_IN_SET(DAYNAME(CURDATE()), (SELECT parsingDays FROM projects WHERE id = _projectId)) > 0 THEN
                DELETE FROM tasks WHERE projectId = _projectId;

                SELECT searchingRange FROM projects WHERE id = _projectId INTO _searchingRange;
                SELECT parsingTime FROM projects WHERE id = _projectId INTO _parsingTime;
                SELECT siteAddress FROM projects WHERE id = _projectId INTO _siteAddress;

                SELECT COUNT(*) FROM _groups WHERE _groups.projectId = _projectId INTO jn;
                SET j=0;
                WHILE j<jn DO
                    SELECT id FROM _groups LIMIT j, 1 INTO _groupId;

                    SELECT COUNT(*) FROM queries WHERE queries.groupId = _groupId INTO kn;
                    SET k=0;
                    WHILE k<kn DO
                        SELECT id FROM queries LIMIT k, 1 INTO _queryId;

                        SELECT queryText FROM queries WHERE id = _queryId INTO _queryText;

                        SELECT COUNT(*) FROM cities WHERE cities.projectId = _projectId INTO mn;
                        SET m=0;
                        WHILE m<mn DO
                            SELECT cityName FROM cities WHERE projectId = _projectId LIMIT m, 1 INTO _cityName;

                            IF FIND_IN_SET('google', (SELECT searchEngine FROM projects WHERE id = _projectId)) > 0 THEN
                                INSERT INTO tasks(projectId, groupId, queryId, queryText, city, searchingEngine, searchingRange, parsingTime, siteAddress)
                                VALUES (_projectId, _groupId, _queryId, _queryText, _cityName, 'google', _searchingRange, _parsingTime, _siteAddress);
                            END IF;

                            IF FIND_IN_SET('yandex', (SELECT searchEngine FROM projects WHERE id = _projectId)) > 0 THEN
                                INSERT INTO tasks(projectId, groupId, queryId, queryText, city, searchingEngine, searchingRange, parsingTime,siteAddress)
                                VALUES (_projectId, _groupId, _queryId, _queryText, _cityName, 'yandex', _searchingRange, _parsingTime, _siteAddress);
                            END IF;

                            SET m = m + 1;
                        END WHILE;

                    SET k = k + 1;
                    END WHILE;

                SET j = j + 1;
                END WHILE;
            END IF;
            SET i = i + 1;
        END WHILE;
END |
delimiter ;