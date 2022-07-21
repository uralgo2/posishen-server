# API
все функции возращают данные в таком формате:
```json5
{
    "successful": true, // true если запрос обработан успешно, false если ошибка
    "data": {}, // данные
    "message": "" // текст ошибки
}
```
## Веб-API
### /api/signup
- Тип запроса - get
- Параметры: 
  1. email - адрес электронной почты
  2. password - пароль
- Метод регистрации пользователя
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
        "c": "a77347fd9734" // код сессии
    }
}
```
### /api/login
- Тип запроса - get
- Параметры:
    1. email - адрес электронной почты
    2. password - пароль
- Метод авторизации пользователя
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
        "c": "a77347fd9734" // код сессии
    }
}
```
### /api/logout
- Тип запроса - get
- Параметры:
    1. c - код сессии
- Метод выхода пользователя из аккаунта
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/getProjects
- Тип запроса - get
- Параметры:
    1. c - код сесси
- Метод получения списка проектов
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": [
        {
            "id": 1,
            "userId": 1,
            "siteAddress": "yandex.ru",
            "searchEngine": "yandex,google",
            "searchingRange": "100",
            "parsingTime": "12:00:00",
            "parsingDays": "Monday,Tuesday,Thursday",
            "queriesCount": 0,
            "lastCollection": "2022-07-14T08:32:52.232Z"
        },
        {
            "id": 2,
            "userId": 1,
            "siteAddress": "pozishen.ru",
            "searchEngine": "yandex",
            "searchingRange": "200",
            "parsingTime": "12:00:00",
            "parsingDays": "Tuesday,Thursday",
            "queriesCount": 10,
            "lastCollection": "2022-07-14T08:32:52.232Z"
        }
    ]
}
```
### /api/restoreChange
- Тип запроса - get
- Параметры:
    1. s - код восстановления
    2. password - новый пароль
- Метод смены пароля после его восстановления
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
        "c": "a77347fd9734" // код сессии
    }
}
```
### /api/restore
- Тип запроса - get
- Параметры:
    1. email - электронная почта для восстановления
- Метод получения письма содержащий ссылку на восстановление пароля
- В случае успеха возращает ответ в виде и отправляет письмо с ссылкой на восстановление на указаный адрес:
```json5
{
    "successful": true
}
```
### /api/changePassword
- Тип запроса - get
- Параметры:
    1. c - код сессии
    2. currentPassword - текущий пароль
    3. newPassword - новый пароль
- Метод смены пароля
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/getMe
- Тип запроса - get
- Параметры:
    1. c - код сессии
- Метод получения информации об пользователе
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
        "id": 1,
        "email": "uralgoyt@gmail.com",
        "balance": 10,
        "executedTasksForDay": 0,
        "executedTasksForWeek": 0,
        "executedTasksForMonth": 0,
        "discount": 0,
        "maxResourceLimit": 10,
        "loadLimit": 80,
        "accountCreatedAt": "2022-07-05T11:16:19.000Z"
    }
}
```
### /api/getClient
- Тип запроса - get
- Параметры:
  1. c - код сессии
- ссылка на скачивание клиента

### /api/addQuery
- Тип запроса - get
- Параметры:
    1. c - код сессии
    2. queryText - текст запроса 
    3. groupId - айди группы
    4. projectId - айди проекта
- Метод добавления запроса
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
      "id": 1,
      "queryText": '',
      "groupId": 1  
    }
}
```
### /api/addGroup
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. name - имя группы 
  3. projectId - айди проекта
- Метод добавления группы
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
      "id": 1,
      "projectId": 1,
      "groupName": '',
      "queriesCount": 0
    }
}
```
### /api/deleteQuery
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. groupId - айди группы
  3. projectId - айди проекта
  4. queryId - айди запроса
- Метод удаления запроса
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/deleteGroup
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. groupId - айди группы
  3. projectId - айди проекта
- Метод удаления группы
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/getQueries
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. groupId - айди группы
  3. projectId - айди проекта
  4. p - необязательный по умолчанию = 0, страница, в каждой странице 25 запросов
- Получить список запросов
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": [
      {
        "id": 1,
        "queryText": '',
        "groupId": 1  
      },
      {
        "id": 2,
        "queryText": '',
        "groupId": 1  
      }
    ]
}
```
### /api/getGroups
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. projectId - айди проекта
- Метод получения групп
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": [
      {
        "id": 1,
        "projectId": 1,
        "groupName": '',
        "queriesCount": 0
      },
      {
        "id": 2,
        "projectId": 1,
        "groupName": '',
        "queriesCount": 10
      }
    ]
}
```
### /api/getProject
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. projectId - айди проекта
- Метод получения проекта по его id
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
            "id": 1,
            "userId": 1,
            "siteAddress": "yandex.ru",
            "searchEngine": "yandex,google",
            "searchingRange": "100",
            "parsingTime": "12:00:00",
            "parsingDays": "Monday,Tuesday,Thursday",
            "queriesCount": 0,
            "lastCollection": "2022-07-14T08:32:52.232Z"
        }
}
```
### /api/getPositions
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. p - номер страницы по умолчанию = 0
  3. groupId - айди группы, 0 = все группы
  4. engine - поисковик yandex/google
  5. from - дата с
  6. to - дата до
  7. projectId - айди проекта
- Метод для получения позиций
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 
    [
      {
        "id": 1,
        "queryId": 1,
        "queryText": "",
        "groupId": 1,
        "projectId": 1,
        "place": 1,
        // 0 - не найдено
        "lastCollection": '2022-07-14T08:32:52.232Z',
        "cityCollection": "Москва",
        "engineCollection": 'yandex',
        "foundAddress": "https://yandex.ru/example"// найденный юрл с искомым доменом
      }
    ]
}
```
### /api/addProject
- Тип запроса - post
- Тело запроса:
```json5
{
  "c": "2324fafc",
  "project": {
    "siteAddress": "pozishen.ru",
    "searchEngine": ["yandex"],
    "searchingRange": "100",
    "parsingTime": "12:00",
    "parsingDays": ["Monday", "Thursday"],
    "cities": [
      "Москва", "Санкт-Петербург"
    ]
  }
}
```
- Метод добавления проекта
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
            "id": 1,
            "userId": 1,
            "siteAddress": "yandex.ru",
            "searchEngine": "yandex,google",
            "searchingRange": "100",
            "parsingTime": "12:00:00",
            "parsingDays": "Monday,Tuesday,Thursday",
            "queriesCount": 0,
            "lastCollection": "2022-07-14T08:32:52.232Z"
        }
}
```
### /api/updateProject
- Тип запроса - post
- Тело запроса:
```json5
{
  "c": "2324fafc",
  "projectId": 1,
  "project": {
    "siteAddress": "pozishen.ru",
    "searchEngine": ["yandex"],
    "searchingRange": "100",
    "parsingTime": "12:00",
    "parsingDays": ["Monday", "Thursday"],
    "cities": [
      "Москва", "Санкт-Петербург"
    ]
  }
}
```
- Метод обновления настроек проекта
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
            "id": 1,
            "userId": 1,
            "siteAddress": "yandex.ru",
            "searchEngine": "yandex,google",
            "searchingRange": "100",
            "parsingTime": "12:00:00",
            "parsingDays": "Monday,Tuesday,Thursday",
            "queriesCount": 0,
            "lastCollection": "2022-07-14T08:32:52.232Z"
        }
}
```
### /api/updateSettings
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. loadLimit - лимит общей нагрузки системы
  3. maxResourceLimit - максимальное использование ресурсов
- Метод обновления настроек программы
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/getQueriesCount
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. groupId - айди группы
  3. projectId - айди проекта
- Метод получения колличества запросов
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 0
}
```
### /api/getCities
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. projectId - айди проекта
- Получить города проекта
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 
    [
      {
        "id": 1,
        "projectId": 1,
        "cityName": "Москва"
      },
      {
        "id": 2,
        "projectId": 1,
        "cityName": "Санкт-Петербург"
      }
    ]
}
```
### /api/getPositionsCount
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. groupId - айди группы, 0 = все группы
  3. engine - поисковик yandex/google
  4. from - дата с
  5. to - дата до
  6. projectId - айди проекта
- Метод получения колличества позиций
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 0
}
```
### /api/getPositionsQuery
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. p - номер страницы по умолчанию = 0
  3. queryId - айди запроса
  4. engine - поисковик yandex/google
  5. from - дата с
  6. to - дата до
  7. projectId - айди проекта
- Метод получения позиций для определенного запроса
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 
    [
        {
          "id": 1,
          "queryId": 1,
          "queryText": "",
          "groupId": 1,
          "projectId": 1,
          "place": 1, // 0 - не найдено
          "lastCollection": '2022-07-14T08:32:52.232Z',
          "cityCollection": "Москва",
          "engineCollection": 'yandex',
          "foundAddress": "https://yandex.ru/example" // найденный юрл с искомым доменом
        }
    ]
}
```
### /api/getExpenses
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. p - номер страницы по умолчанию = 0
  3. from - дата с
  4. to - дата до
- Метод получения расходов
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 
    [
       {
        "id": 1,
        "userId": 1,
        "date": "",
        "projectId": 1,
        "expense": "0.8"
       }
    ]
}
```
### /api/getExpensesCount
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. from - дата с
  3. to - дата до
- Метод получения колличества расходов
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": 0
}
```
### /api/searchCities
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. search - поиск
  3. count - колличество
- Метод поиска городов по поисковому запросу
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": [
      {
        "name": "Москва",
      }
    ]
}
```
### /api/collect
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. projectId - айди проекта
- Метод для начала ручного сбора позиций
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true
}
```
### /api/getLastAndFirstPositionDate
- Тип запроса - get
- Параметры:
  1. c - код сессии
  2. queryId - айди запроса
  3. engine - поисковик yandex/google
  4. projectId - айди проекта
  5. groupId - айди группы по умолчанию 0 - все группы
- Метод для получения первой и последней позиции
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
      "first": {
        "id": 34,
        "queryId": 1,
        "queryText": "",
        "groupId": 1,
        "projectId": 1,
        "place": 1, // 0 - не найдено
        "lastCollection": '2022-07-14T08:32:52.232Z',
        "cityCollection": "Москва",
        "engineCollection": 'yandex',
        "foundAddress": "https://yandex.ru/example" // найденный юрл с искомым доменом
      },
      "last": {
        "id": 1,
        "queryId": 1,
        "queryText": "",
        "groupId": 1,
        "projectId": 1,
        "place": 1, // 0 - не найдено
        "lastCollection": '2022-07-01T08:32:52.232Z',
        "cityCollection": "Москва",
        "engineCollection": 'yandex',
        "foundAddress": "https://yandex.ru/example" // найденный юрл с искомым доменом
      }
    }
}
```

## Клиентское API
### /api/getSettings
- Тип запроса - get
- Параметры:
  1. p - программный хэш
- Метод получения настроек программы
- В случае успеха возращает ответ в виде:
```json5
{
    "successful": true,
    "data": {
      "loadLimit": 80,
      "maxResourceLimit": 10
    }
}
```
### /api/getTask
- Тип запроса - get
- Параметры:
  1. p - программный хэш
- Метод получения задачи, если задач нет то возращает сообщение "Нет доступных задач"
- В случае успеха возращает ответ в виде:

```json5
{
  "successful": true,
  "data": {
    "id": 1,
    "projectId": 1,
    "groupId": 1,
    "queryId": 1,
    "queryText": "",
    "city": "Москва",
    "searchingEngine": "yandex",
    "searchingRange": "100",
    "parsingTime": "12:00",
    "siteAddress": "pozishen.ru"
  }
}
```
- По истечению 10 минут задачу завершить нельзя
### /api/endTask
- Тип запроса - get
- Параметры:
  1. p - программный хэш
  2. place - место в поисковой выдаче, если не найдено то 0
  3. taskId - айди задачи
  4. foundAddress - адрес найденного сайта с искомым доменом, например ```https://pozishen.ru/example/test```
- Метод завершения задачи
- В случае успеха возращает ответ в виде:

```json5
{
  "successful": true
}
```
# База данных
[Таблицы](./sql/database.sql)

[События](./sql/events.sql)

[Процедуры](./sql/procedures.sql)

[Триггеры](./sql/triggers.sql)