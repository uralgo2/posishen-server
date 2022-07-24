use pozishen;

drop table users, projects, _groups, queries, cities, results, sessions, expenses, tasks, cityNames, subgroups, frequencies;

create table users (
	id INT AUTO_INCREMENT PRIMARY KEY, -- уникальный индетификатор пользователя
	email VARCHAR(255) NOT NULL, 
    hashedPassword CHAR(128) NOT NULL, -- хэш пароля
	balance DECIMAL(65, 4) DEFAULT 100, -- баланс по умолчанию 100 руб.
    executedTasksForDay INT DEFAULT 0, -- выполненные задачи за день
	executedTasksForWeek INT DEFAULT 0, -- выполненные задачи за неделю
    executedTasksForMonth INT DEFAULT 0, -- выполненные задачи за месяц
    discount INT DEFAULT 0, -- скидка на тариф
    maxResourceLimit INT DEFAULT 10, -- максимальное использование ресурсов
    loadLimit INT DEFAULT 80,  -- лимит общей нагрузки пк при которой минимизируется работы программы
    accountCreatedAt DATETIME DEFAULT NOW(), -- дата создания аккаунта
	restoreHash CHAR(128) DEFAULT '', -- хэш для востановления пароля
    programHash CHAR(128) NOT NULL, -- хэш для программы
    lastMonthExpense DECIMAL(65, 4) DEFAULT 0, -- расходы за последний месяц
    programInstalled BOOL DEFAULT FALSE, -- установлена ли программа
    online BOOL DEFAULT FALSE -- запущенна ли программа
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
    queriesCount INT DEFAULT 0, -- колличество запросов
    lastCollection VARCHAR(255) DEFAULT '-', -- дата последнего сбора
    collected BOOLEAN DEFAULT FALSE, -- собраны ли данные в текущем сборе?
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
create table _groups (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    projectId INT NOT NULL, -- айди проекта
    groupName VARCHAR(255) NOT NULL, -- имя группы
    queriesCount INT DEFAULT 0, -- колличество запросов в группе
    FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
);
create table subgroups (
  id INT AUTO_INCREMENT PRIMARY KEY, -- айди
  groupId INT NOT NULL,
  subgroupName VARCHAR(255) NOT NULL,
  queriesCount INT DEFAULT 0,
  FOREIGN KEY (groupId) REFERENCES _groups(id) ON DELETE CASCADE
);
create table cities (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    projectId INT NOT NULL, -- айди проекта
	cityName VARCHAR(255), -- название города
    FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE CASCADE
);
create table queries (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    groupId INT NOT NULL, -- айди группы
    subgroupId INT DEFAULT NULL,
    queryText VARCHAR(255) NOT NULL, -- текст запроса
    FOREIGN KEY (groupId) REFERENCES _groups (id) ON DELETE CASCADE,
    FOREIGN KEY (subgroupId) REFERENCES subgroups(id) ON DELETE CASCADE
);
create table frequencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    queryText INT NOT NULL,
    cityName VARCHAR(255),
    frequency VARCHAR(20) DEFAULT '--'
);
create table results (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
	queryId INT NOT NULL, -- айди запроса
    queryText VARCHAR(255) NOT NULL, -- текст запроса
	groupId INT NOT NULL, -- адйи группы
	projectId INT NOT NULL, -- айди проекта
    place INT NOT NULL, -- место в поисковой выдаче
    lastCollection DATETIME DEFAULT NOW(), -- дата сбора
    cityCollection VARCHAR(255) NOT NULL, -- город сбора
    engineCollection ENUM('yandex', 'google') NOT NULL, -- поисковик
    foundAddress VARCHAR(255) NOT NULL, -- найденные адрес
    subgroupId INT DEFAULT NULL,
    FOREIGN KEY (queryId) REFERENCES queries (id) ON DELETE CASCADE,
    FOREIGN KEY (subgroupId) REFERENCES subgroups(id) ON DELETE CASCADE
);
create table sessions (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    userId INT NOT NULL, -- айди пользователя
    secret CHAR(128) NOT NULL, -- секретный хэш для сессии
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
create table expenses (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    userId INT NOT NULL, -- айди пользователя
    date DATETIME DEFAULT NOW(), -- дата расхода
    projectId INT NOT NULL, -- айди проекта
    expense DECIMAL(65, 4) NOT NULL, -- расход
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

create table tasks (
	id INT AUTO_INCREMENT PRIMARY KEY, -- айди
	userId INT NOT NULL, -- айди пользователя
    projectId INT NOT NULL, -- айди проекта
    groupId INT NOT NULL, -- айди группы
    subgroupId INT DEFAULT NULL,
    queryId INT NOT NULL, -- айди запроса
    queryText VARCHAR(255) NOT NULL, -- текст запроса
    city VARCHAR (255) NOT NULL, -- город
    searchingEngine ENUM('yandex', 'google') NOT NULL, -- поисковик
    searchingRange ENUM('100', '200') NOT NULL, -- глубина поиска
    parsingTime TIMESTAMP NOT NULL, -- время парсинга
    siteAddress VARCHAR(255) NOT NULL, -- домен искомого сайта
    userOnline BOOL DEFAULT FALSE, -- запущена ли программа пользователя - владельца проекта
    executing BOOL DEFAULT FALSE, -- выполняется этот запрос, пока истино сервер не будет давать это задание
    -- если через 10 мин оно все еще в состоянии исполнения то, сервер повторо заносит его в список заданий 
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (queryId) REFERENCES queries(id) ON DELETE CASCADE,
	FOREIGN KEY (groupId) REFERENCES _groups(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subgroupId) REFERENCES subgroups(id) ON DELETE CASCADE
);

create table cityNames (
    id INT AUTO_INCREMENT PRIMARY KEY, -- айди
    name VARCHAR(255) NOT NULL UNIQUE KEY -- имя города
);

INSERT INTO cityNames(name) -- добавляем города для поиска
VALUES
    ('Архангельск'),
    ('Астрахань'),
    ('Барнаул'),
    ('Белгород'),
    ('Благовещенск'),
    ('Брянск'),
    ('Великий Новгород'),
    ('Владивосток'),
    ('Владикавказ'),
    ('Владимир'),
    ('Волгоград'),
    ('Вологда'),
    ('Воронеж'),
    ('Грозный'),
    ('Екатеринбург'),
    ('Иваново'),
    ('Иркутск'),
    ('Йошкар-Ола'),
    ('Казань'),
    ('Калининград'),
    ('Кемерово'),
    ('Кострома'),
    ('Краснодар'),
    ('Красноярск'),
    ('Курган'),
    ('Курск'),
    ('Липецк'),
    ('Махачкала'),
    ('Москва и область'),
    ('Москва'),
    ('Мурманск'),
    ('Назрань'),
    ('Нальчик'),
    ('Нижний Новгород'),
    ('Новосибирск'),
    ('Омск'),
    ('Орел'),
    ('Оренбург'),
    ('Пенза'),
    ('Пермь'),
    ('Псков'),
    ('Ростов-на-Дону'),
    ('Рязань'),
    ('Самара'),
    ('Санкт-Петербург'),
    ('Саранск'),
    ('Смоленск'),
    ('Сочи'),
    ('Ставрополь'),
    ('Сургут'),
    ('Тамбов'),
    ('Тверь'),
    ('Томск'),
    ('Тула'),
    ('Ульяновск'),
    ('Уфа'),
    ('Хабаровск'),
    ('Чебоксары'),
    ('Челябинск'),
    ('Черкесск'),
    ('Ярославль')
;