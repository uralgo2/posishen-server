## API
все функции возращают данные в таком формате:
```
{
    successful: true, // true если запрос обработан успешно, false если ошибка
    data: {...}, // данные
    message: "" // текст ошибки
}
```
### /api/signup
- Тип запроса - get
- Параметры: 
  1. email - адрес электронной почты
  2. password - пароль
  
- В случае успеха возращает ответ в виде:
```
{
    successful: true,
    data: {
        c: "a77347fd9734" // код сессии
    }
}
```
### /api/login
- Тип запроса - get
- Параметры:
    1. email - адрес электронной почты
    2. password - пароль

- В случае успеха возращает ответ в виде:
```
{
    successful: true,
    data: {
        c: "a77347fd9734" // код сессии
    }
}
```
### /api/logout
- Тип запроса - get
- Параметры:
    1. c - код сессии

- В случае успеха возращает ответ в виде:
```
{
    successful: true
}
```
### /api/getProjects
- Тип запроса - get
- Параметры:
    1. c - код сесси
- В случае успеха возращает ответ в виде:
```
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
            "queriesCount": 0
        }
    ]
}
```
### /api/restore/check
- Тип запроса - get
- Параметры:
    1. s - код восстановления

- В случае успеха возращает ответ в виде:
```
{
    successful: true,
    data: {
        c: "a77347fd9734" // код сессии
    }
}
```
### /api/restore
- Тип запроса - get
- Параметры:
    1. email - электронная почта для восстановления

- В случае успеха возращает ответ в виде и отправляет письмо с ссылкой на восстановление на указаный адрес:
```
{
    successful: true
}
```
### /api/changePassword
- Тип запроса - get
- Параметры:
    1. c - код сессии
    2. currentPassword - текущий пароль
    3. newPassword - новый пароль

- В случае успеха возращает ответ в виде:
```
{
    successful: true
}
```
### /api/getMe
- Тип запроса - get
- Параметры:
    1. c - код сессии

- В случае успеха возращает ответ в виде:
```
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
- ссылка на скачивание клиента
### /api/getConfig
- Тип запроса - get
- Параметры:
    1. c - код сессии

- Ссылка на скачивание файла конфигурации
### /api/addQuery
- Тип запроса - get
- Параметры:
    1. c - код сессии
    2. queryText - текст запроса 
    3. groupId - айди группы
    4. projectId - айди проекта

- В случае успеха возращает ответ в виде:
```
{
    successful: true
}
```