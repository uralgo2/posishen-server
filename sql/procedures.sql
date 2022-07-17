DROP PROCEDURE IF EXISTS collect;
DROP PROCEDURE IF EXISTS collectProject;
delimiter //
CREATE PROCEDURE collect(IN _id INT)
BEGIN
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
    DECLARE _queryText VARCHAR(255);
    DECLARE _siteAddress VARCHAR(255);
    DECLARE _userId INT DEFAULT 0;
    DECLARE _price DECIMAL(65, 4) DEFAULT 0.05;
    DECLARE _programInstalled BOOl DEFAULT FALSE;
    DECLARE _lastMonthExpense DECIMAL(65, 4) DEFAULT 0;
    DECLARE _expense DECIMAL(65, 4) DEFAULT 0;
    Declare _queriesCount INT DEFAULT 0;
            SET _projectId = _id;


                DELETE FROM tasks WHERE projectId = _projectId AND executing = 0;

                SELECT searchingRange, siteAddress, userId, queriesCount FROM projects WHERE id = _projectId
                INTO _searchingRange, _siteAddress, _userId, _queriesCount;

                SELECT COUNT(*) FROM _groups WHERE _groups.projectId = _projectId INTO jn;
                SELECT programInstalled, lastMonthExpense FROM users WHERE id = _userId INTO _programInstalled, _lastMonthExpense;

                IF _programInstalled = 1 THEN
                    IF _lastMonthExpense <= 300 THEN
                        SET _price = 0.02;
                    ELSEIF _lastMonthExpense <= 500 THEN
                        SET _price = 0.019;
                    ELSEIF _lastMonthExpense <= 1000 THEN
                        SET _price = 0.018;
                    ELSEIF _lastMonthExpense <= 3000 THEN
                        SET _price = 0.017;
                    ELSEIF _lastMonthExpense <= 10000 THEN
                        SET _price = 0.016;
                    ELSE
                        SET _price = 0.015;
                    END IF;
                END IF;

                    SET _expense = _price * _queriesCount;

                    UPDATE users
                    SET lastMonthExpense = lastMonthExpense + _expense,
                    balance = balance - _expense
                    WHERE id = _userId;

                    INSERT INTO expenses(userId, projectId, expense)
                    VALUES (_userId, _projectId, _expense);

                SET j=0;
                WHILE j<jn DO
                        SELECT id FROM _groups WHERE projectId = _projectId LIMIT j, 1 INTO _groupId;

                        SELECT COUNT(*) FROM queries WHERE queries.groupId = _groupId INTO kn;
                        SET k=0;
                        WHILE k<kn DO
                                SELECT id FROM queries WHERE groupId = _groupId LIMIT k, 1 INTO _queryId;

                                SELECT queryText FROM queries WHERE id = _queryId INTO _queryText;

                                SELECT COUNT(*) FROM cities WHERE cities.projectId = _projectId INTO mn;
                                SET m=0;
                                WHILE m<mn DO
                                        SELECT cityName FROM cities WHERE projectId = _projectId LIMIT m, 1 INTO _cityName;

                                        IF FIND_IN_SET('google', (SELECT searchEngine FROM projects WHERE id = _projectId)) > 0 THEN
                                            INSERT INTO tasks(userId, projectId, groupId, queryId, queryText, city, searchingEngine, searchingRange, parsingTime, siteAddress)
                                            VALUES (_userId,_projectId, _groupId, _queryId, _queryText, _cityName, 'google', _searchingRange, NOW(), _siteAddress);
                                        END IF;

                                        IF FIND_IN_SET('yandex', (SELECT searchEngine FROM projects WHERE id = _projectId)) > 0 THEN
                                            INSERT INTO tasks(userId, projectId, groupId, queryId, queryText, city, searchingEngine, searchingRange, parsingTime,siteAddress)
                                            VALUES (_userId, _projectId, _groupId, _queryId, _queryText, _cityName, 'yandex', _searchingRange, NOW(), _siteAddress);
                                        END IF;

                                        SET m = m + 1;
                                    END WHILE;

                                SET k = k + 1;
                            END WHILE;

                        SET j = j + 1;
                    END WHILE;
END//

CREATE PROCEDURE collectProject(_projectId INT)
BEGIN
    IF FIND_IN_SET(DAYNAME(CURDATE()), (SELECT parsingDays FROM projects WHERE id = _projectId)) > 0 THEN
        call collect(_projectId);
    END IF;
END//

/**
  let price = 0.05
                let user = _users[0]
                if(user.programInstalled){
                    if(user.lastMonthExpense <= 300)
                        price = 0.02
                    else if(user.lastMonthExpense <= 500)
                        price = 0.019
                    else if(user.lastMonthExpense <= 1000)
                        price = 0.018
                    else if(user.lastMonthExpense <= 3000)
                        price = 0.017
                    else if(user.lastMonthExpense <= 10000)
                        price = 0.016
                    else
                        price = 0.015
                }
                await sql.query('UPDATE users SET lastMonthExpense = lastMonthExpense + ?, balance = balance - ? WHERE id = ?', [price, price, users[0].userId])
                await sql.query(`INSERT INTO expenses (userId, projectId, expense)
                    VALUES(?, ?, ?) `, [user.id, task.projectId, price])
 */