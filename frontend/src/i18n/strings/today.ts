/** UI strings of the Today page (the home page). */

const en = {
  "today.title": "Today",
  "today.loadError": "Couldn't load what's next. Is the tracker still running?",

  "today.gettingStarted": "Getting started",
  "today.gettingStartedBody":
    "No applications yet. Start with the first one: you only need a company and a role.",

  "today.noApplicationsYet": "No applications yet",
  "today.sofar": "So far: {items}. ",
  "today.sofarRoles": "{n} role to decide on|{n} roles to decide on",
  "today.sofarCalls": "{n} call coming up|{n} calls coming up",
  "today.sofarPeople": "{n} person added|{n} people added",
  "today.applyToBecome": "Apply for one of the roles and it becomes an application.",
  "today.addWhenYouGo": "Add one when you go for a role: it only needs a company and a title.",

  "today.active": "active",
  "today.interviews": "interview|interviews",
  "today.inTwoWeeks": " in the next two weeks",
  "today.offers": "offer|offers",
  "today.toAnswer": " to answer",
  "today.byStage": "Active applications by stage",
  "today.openAria": "Open {name}",

  "today.yourMove": "Your move",
  "today.yourMoveHint": "Things to do now",
  "today.allCaughtUp": "All caught up",
  "today.allCaughtUpBody": "Nothing needs you right now. Replies, follow-ups and your to-dos show up here.",

  "today.repliesToRead": "Replies to read",
  "today.repliesToReadHint": "They've replied; oldest first",
  "today.offersToAnswer": "Offers to answer",
  "today.offersToAnswerHint": "Reply due in the next two weeks",
  "today.howDidItGo": "How did it go?",
  "today.howDidItGoHint": "Their time has passed",
  "today.todos": "To-dos",
  "today.todosHint": "Your own reminders; tick them off when done",
  "today.hideDone": "Hide done",
  "today.doneRecently": "Done recently",
  "today.nothingTicked": "Nothing ticked off yet.",
  "today.followUp": "Follow up",
  "today.followUpHint": "Follow-up date is today or earlier",
  "today.dueDate": "due {date}",
  "today.rolesToDecide": "Roles to decide",
  "today.rolesToDecideHint": "Apply, mark interested, or pass on each",

  "today.comingUp": "Coming up",
  "today.comingUpHint": "Interviews, calls and to-dos by date; nothing to do yet",
  "today.comingUpEmpty": "No interviews, calls or dated to-dos ahead.",

  "today.waitingOnThem": "Waiting on them",
  "today.waitingOnThemHint": "Red means time to chase",
  "today.waitingOnThemEmpty": "You're not waiting on anyone.",
  "today.waitingToHearBack": "Waiting to hear back",
  "today.waitingToHearBackHint": "You replied; red means time to chase",
  "today.timeToChase": " · time to chase",
  "today.goneQuiet": "Gone quiet",
  "today.goneQuietHint": "No activity for longer than their stage allows",

  "today.done": "Done",
  "today.due": "Due ",
  "today.notBookedYet": "Not booked yet",
  "today.replyWasDue": "Reply was due",
  "today.replyBy": "Reply by",

  "today.recentActivity": "Recent activity",
  "today.nothingRecent": "Nothing in the last two weeks.",
  "today.fullTimeline": "Full timeline",
  "today.countIn": "{n} in {title}",
} as const;

const ru: Record<keyof typeof en, string> = {
  "today.title": "Сегодня",
  "today.loadError": "Не удалось загрузить «Что дальше». Трекер ещё запущен?",

  "today.gettingStarted": "Начало работы",
  "today.gettingStartedBody": "Заявок пока нет. Начните с первой: нужны только компания и роль.",

  "today.noApplicationsYet": "Заявок пока нет",
  "today.sofar": "Пока: {items}. ",
  "today.sofarRoles": "{n} роль ждёт решения|{n} роли ждут решения|{n} ролей ждут решения",
  "today.sofarCalls": "{n} звонок впереди|{n} звонка впереди|{n} звонков впереди",
  "today.sofarPeople": "{n} человек добавлен|{n} человека добавлено|{n} людей добавлено",
  "today.applyToBecome": "Откликнитесь на одну из ролей — и она станет заявкой.",
  "today.addWhenYouGo": "Добавьте, когда пойдёте на роль: нужны только компания и название.",

  "today.active": "активных",
  "today.interviews": "собеседование|собеседования|собеседований",
  "today.inTwoWeeks": " в ближайшие две недели",
  "today.offers": "оффер|оффера|офферов",
  "today.toAnswer": " ждут ответа",
  "today.byStage": "Активные заявки по стадиям",
  "today.openAria": "Открыть {name}",

  "today.yourMove": "Ваш ход",
  "today.yourMoveHint": "Что сделать сейчас",
  "today.allCaughtUp": "Всё разобрано",
  "today.allCaughtUpBody": "От вас сейчас ничего не требуется. Ответы, напоминания и задачи появятся здесь.",

  "today.repliesToRead": "Ответы на прочтение",
  "today.repliesToReadHint": "Они ответили; сначала старые",
  "today.offersToAnswer": "Офферы ждут ответа",
  "today.offersToAnswerHint": "Ответ нужен в течение двух недель",
  "today.howDidItGo": "Как всё прошло?",
  "today.howDidItGoHint": "Их время истекло",
  "today.todos": "Задачи",
  "today.todosHint": "Ваши напоминания; отмечайте по выполнении",
  "today.hideDone": "Скрыть выполненные",
  "today.doneRecently": "Выполненные недавно",
  "today.nothingTicked": "Пока ничего не отмечено.",
  "today.followUp": "Напоминания",
  "today.followUpHint": "Дата напоминания — сегодня или раньше",
  "today.dueDate": "срок {date}",
  "today.rolesToDecide": "Роли на решение",
  "today.rolesToDecideHint": "Откликнуться, отметить интерес или отказаться по каждой",

  "today.comingUp": "Скоро",
  "today.comingUpHint": "Собеседования, звонки и задачи по датам; пока ничего нет",
  "today.comingUpEmpty": "Собеседований, звонков и задач с датами нет.",

  "today.waitingOnThem": "Ждём их",
  "today.waitingOnThemHint": "Красный — пора пинать",
  "today.waitingOnThemEmpty": "Вы сейчас никого не ждёте.",
  "today.waitingToHearBack": "Ждём ответа",
  "today.waitingToHearBackHint": "Вы ответили; красный — пора пинать",
  "today.timeToChase": " · пора пинать",
  "today.goneQuiet": "Замолчали",
  "today.goneQuietHint": "Активности нет дольше, чем допускает стадия",

  "today.done": "Готово",
  "today.due": "Срок: ",
  "today.notBookedYet": "Ещё не назначено",
  "today.replyWasDue": "Ответ просрочен",
  "today.replyBy": "Ответить до",

  "today.recentActivity": "Недавняя активность",
  "today.nothingRecent": "За последние две недели ничего нет.",
  "today.fullTimeline": "Весь таймлайн",
  "today.countIn": "{n} · {title}",
};

export { en, ru };
