use pozishen;
drop table users, projects, _groups, queries, cities, results, sessions, expenses, tasks; 

create table users (
	id INT AUTO_INCREMENT PRIMARY KEY, -- уникальный индетификатор пользователя
	email VARCHAR(255) NOT NULL, 
    hashedPassword CHAR(128) NOT NULL, -- хэш пароля
	balance INT DEFAULT 10, -- баланс по умолчанию 10 руб. 
    executedTasksForDay INT DEFAULT 0, -- выполненные задачи за день
	executedTasksForWeek INT DEFAULT 0, -- выполненные задачи за неделю
    executedTasksForMonth INT DEFAULT 0, -- выполненные задачи за месяц
    discount INT DEFAULT 0, -- скидка на тариф
    maxResourceLimit INT DEFAULT 10, -- максимальное использование ресурсов
    loadLimit INT DEFAULT 80,  -- лимит общей нагрузки пк при которой минимизируется работы программы
    accountCreatedAt DATETIME DEFAULT NOW(), -- дата создания аккаунта
	restoreHash CHAR(128) DEFAULT '', -- хэш для востановления пароля
    programHash CHAR(128) NOT NULL -- хэш для программы
);
create table projects (
	id INT AUTO_INCREMENT PRIMARY KEY, -- уникальный индетификаток задачи
    userId INT NOT NULL, -- айди пользователя
    siteAddress VARCHAR(255) NOT NULL, -- домен искомого сайта
    searchEngine SET('yandex', 'google') NOT NULL, -- используемая поисковая система
    searchingRange ENUM('100', '200') NOT NULL, -- диапазон парсинга
    parsingTime TIME NOT NULL, -- время парсинга
    parsingDays SET(
		'Monday', 'Tuesday', 
		'Wednesday', 'Thursday', 
		'Friday', 'Saturday', 
		'Sunday'
	) NOT NULL, -- дни парсинга
    queriesCount INT DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE    
);
create table _groups (
	id INT AUTO_INCREMENT PRIMARY KEY,
    projectId INT NOT NULL,
    groupName VARCHAR(255) NOT NULL,
    queriesCount INT DEFAULT 0,
    FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
);
create table cities (
	id INT AUTO_INCREMENT PRIMARY KEY,
    projectId INT NOT NULL, -- айди задачи
	cityName VARCHAR(255), -- название города
    FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
);
create table queries (
	id INT AUTO_INCREMENT PRIMARY KEY,
    groupId INT NOT NULL,
    queryText VARCHAR(255) NOT NULL,
    FOREIGN KEY (groupId) REFERENCES _groups (id) ON DELETE CASCADE
);
create table results (
	id INT AUTO_INCREMENT PRIMARY KEY,
	queryId INT NOT NULL,
    queryText VARCHAR(255) NOT NULL,
	groupId INT NOT NULL,
	projectId INT NOT NULL,
    place INT NOT NULL,
    lastCollection DATE NOT NULL,
    cityCollection VARCHAR(255) NOT NULL,
    engineCollection ENUM('yandex', 'google') NOT NULL,
    foundAddress VARCHAR(255) NOT NULL,
    FOREIGN KEY (queryId) REFERENCES queries (id) ON DELETE CASCADE
);
create table sessions (
	id INT AUTO_INCREMENT PRIMARY KEY, 
    userId INT NOT NULL, -- айди пользователя
    secret CHAR(128) NOT NULL, -- секретный хэш для сессии
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
create table expenses (
	id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    date DATE NOT NULL,
    expense INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

create table tasks (
	id INT AUTO_INCREMENT PRIMARY KEY,
    projectId INT NOT NULL,
    groupId INT NOT NULL,
    queryId INT NOT NULL,
    queryText VARCHAR(255) NOT NULL,
    city VARCHAR (255) NOT NULL,
    searchingEngine ENUM('yandex', 'google') NOT NULL,
    searchingRange ENUM('100', '200') NOT NULL,
    parsingTime TIME NOT NULL,
    siteAddress VARCHAR(255) NOT NULL,
    executing BOOL DEFAULT FALSE, -- выполняется этот запрос, пока истино сервер не будет давать это задание
    -- если через 10 мин оно все еще в состоянии исполнения то, сервер повторо заносит его в список заданий 
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (queryId) REFERENCES queries(id) ON DELETE CASCADE,
	FOREIGN KEY (groupId) REFERENCES _groups(id) ON DELETE CASCADE
);