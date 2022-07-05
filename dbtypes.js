/**
 * @name User
 * @type {{
 *     id: Number,
 *     email: String,
 *     hashedPassword: String,
 *     balance: Number,
 *     executedTasksForDay: Number,
 *     executedTasksForWeek: Number,
 *     executedTasksForMonth: Number,
 *     discount: Number,
 *     maxResourceLimit: Number,
 *     loadLimit: Number,
 *     accountCreatedAt: Date,
 *     restoreHash: String,
 *     programHash: String
 * }}
 */

/**
 * @name Project
 * @type {{
 *     id: Number,
 *     userId: Number,
 *     siteAddress: String,
 *     searchEngine: String,
 *     searchingRange: "100" | "200",
 *     parsingTime: Date,
 *     parsingDays: String,
 *     queriesCount: Number,
 * }}
 */

/**
 * @name Group
 * @type {{
 *     id: Number,
 *     projectId: Number,
 *     groupName: String,
 * }}
 */

/**
 * @name City
 * @type {{
 *     id: Number,
 *     projectId: Number,
 *     cityName: String,
 * }}
 */

/**
 * @name SearchingQuery
 * @type {{
 *     id: Number,
 *     groupId: Number,
 *     queryText: String,
 * }}
 */

/**
 * @name Result
 * @type {{
 *     id: Number,
 *     queryId: Number,
 *     place: Number,
 *     lastCollection: Date
 * }}
 */

/**
 * @name UserSession
 * @type {{
 *     id: Number,
 *     userId: Number,
 *     secret: String,
 * }}
 */

/**
 * @name GroupJson
 * @type{{
 *     groupName: String,
 *     queries: String[]
 * }}
 */

/**
 * @name ProjectJson
 * @type {{
 * siteAddress: String,
 * searchEngine: Set<String>,
 * searchingRange: "100" | "200",
 * parsingTime: String,
 * parsingDays: Set<String>,
 * groups: GroupJson[],
 * cities: String[]
 * }}
 */

/**
 * @name Task
 * @type {{
 *     id: Number,
 *     projectId: Number,
 *     groupId: Number,
 *     queryId: Number,
 *     executing: Boolean,
 *     city: String,
 *     searchingEngine: String
 * }}
 */