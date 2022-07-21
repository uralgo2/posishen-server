use pozishen;

DROP EVENT IF EXISTS e_daily;
DROP EVENT IF EXISTS e_weekly;
DROP EVENT IF EXISTS e_monthly;
DROP  EVENT IF EXISTS event_task_create;
delimiter //

CREATE EVENT e_daily -- обновляем выполненные задачи за день
    ON SCHEDULE
        EVERY 1 DAY
    DO
BEGIN
UPDATE users SET executedTasksForWeek = executedTasksForWeek + executedTasksForDay,
                 executedTasksForDay = 0;

END //

CREATE EVENT e_weekly -- обновляем выполненные задачи за неделю
    ON SCHEDULE
        EVERY 1 WEEK
    DO
BEGIN
UPDATE users SET executedTasksForMonth = executedTasksForMonth + executedTasksForWeek,
                 executedTasksForWeek = 0;

END //

CREATE EVENT e_monthly -- обновляем выполненные задачи за месяц и траты за месяц
    ON SCHEDULE
        EVERY 1 MONTH
    DO
BEGIN
UPDATE users SET executedTasksForMonth = 0, lastMonthExpense = 0;
END //

