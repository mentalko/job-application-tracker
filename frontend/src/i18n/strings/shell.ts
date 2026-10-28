/** UI strings of the app shell: navigation, header, help, API status and the placeholder page. */

const en = {
  "nav.group.applications": "Your applications",
  "nav.group.people": "People and companies",
  "nav.group.files": "Files and notes",
  "nav.group.review": "Review",

  "nav.label.today": "Today",
  "nav.desc.today": "Your move, what's coming up, and who you're waiting on.",
  "nav.label.roles": "Roles",
  "nav.desc.roles":
    "Roles you might go for: pitched by a recruiter or spotted, then applied for or passed on.",
  "nav.label.applications": "Applications",
  "nav.desc.applications": "Every application as a filterable list or a board.",
  "nav.label.recruiters": "Recruiters",
  "nav.desc.recruiters": "Agencies and recruiters, their contact details and the roles they've sent.",
  "nav.label.companies": "Companies",
  "nav.desc.companies": "Companies, their roles and who you've spoken to.",
  "nav.label.interviews": "Interviews",
  "nav.desc.interviews": "Interviews and coding tasks: schedule, prep and debriefs.",
  "nav.label.offers": "Offers",
  "nav.desc.offers": "Offers side by side: salary, bonus, equity, pension, day rate and IR35.",
  "nav.label.documents": "Documents",
  "nav.desc.documents": "CV and cover-letter versions, and where each was sent.",
  "nav.label.notes": "Notes",
  "nav.desc.notes": "Markdown notes on anything, plus general notes.",
  "nav.label.insights": "Insights",
  "nav.desc.insights": "Sankey diagram of your funnel, conversion rates and recruiter scorecards.",
  "nav.label.timeline": "Timeline",
  "nav.desc.timeline":
    "Everything that happened, by day or one row per role: calls, pitches, applications and outcomes.",

  "shell.mainNav": "Main navigation",
  "shell.toggleNav": "Toggle navigation",
  "shell.wordmarkAria": "Job Application Tracker: today",
  "shell.language": "Language",
  "shell.switchMode": "Switch to {mode} mode",
  "shell.modeLight": "light",
  "shell.modeDark": "dark",

  "shell.search": "Search everything",

  "shell.newApplication": "New application",

  "shell.howItWorks": "How it works",
  "shell.how.s1.title": "Add an application",
  "shell.how.s1.a": "Press ",
  "shell.how.s1.bold": "New application",
  "shell.how.s1.b":
    " (top right, on any page). Type the company and role. If a recruiter brought it to you, choose ",
  "shell.how.s1.italic": "Through a recruiter",
  "shell.how.s1.c":
    " and type the agency and their name. Anything new is created for you, so there's no need to set up companies or recruiters first.",
  "shell.how.s2.title": "Move it along",
  "shell.how.s2.a": "Drag it across the board on ",
  "shell.how.s2.bold": "Applications",
  "shell.how.s2.b": ", or use the stage buttons on its page, as you apply, hear back and interview.",
  "shell.how.s3.title": "Log what happens",
  "shell.how.s3.a":
    "On the application's page: calls, emails, notes, interviews, offers and files. When you've replied and the ball is in their court, press ",
  "shell.how.s3.bold": "I've replied, waiting",
  "shell.how.s4.title": "Start from Today",
  "shell.how.s4.a": "",
  "shell.how.s4.bold1": "Your move",
  "shell.how.s4.b": " is what to do now (replies to read, follow-ups due, your to-dos), ",
  "shell.how.s4.bold2": "Coming up",
  "shell.how.s4.c": " is what's booked, and ",
  "shell.how.s4.bold3": "Waiting on them",
  "shell.how.s4.d": " is who to chase.",
  "shell.how.s5.title": "Look back",
  "shell.how.s5.a": "",
  "shell.how.s5.bold1": "Timeline",
  "shell.how.s5.b":
    " shows everything that happened, by day or one row per role from the first call to the outcome; ",
  "shell.how.s5.bold2": "Insights",
  "shell.how.s5.c": " shows how the search is going, including which CV version works best.",
  "shell.how.tail.a": "Someone got in touch without a specific role? Add them on ",
  "shell.how.tail.bold1": "Recruiters",
  "shell.how.tail.b": " (agency recruiters) or on the company's page (people who work there), then ",
  "shell.how.tail.bold2": "Book a call",
  "shell.how.tail.c":
    " on their page. After the call, add the roles they mentioned and decide on each under ",
  "shell.how.tail.bold3": "Roles",
  "shell.how.tail.d": ".",

  "shell.localFirst": "Local-first · your data stays on this machine",
  "shell.backup": "Download a backup",
  "shell.backupHint":
    "Everything in one zip: your data, notes and files. Unzip it and run `jat init` on the folder (it rebuilds everything).",

  "shell.api.checking": "Connecting…",
  "shell.api.checkingHint": "Checking the local API",
  "shell.api.offline": "API offline",
  "shell.api.offlineHint": "Start it with `uv run jat serve`",
  "shell.api.connected": "Connected",
  "shell.api.version": "v{version} · schema {schema}",
  "shell.api.backups": " · backups on",
  "shell.api.noGitRepo": " · data dir isn't a git repo",

  "shell.comingSoon": "Coming soon",
  "shell.roadmapTask": "Roadmap task",

  "time.today": "today",
  "time.yesterday": "yesterday",
  "time.daysAgo": "{n} day ago|{n} days ago",
  "time.weeksAgo": "{n} week ago|{n} weeks ago",
  "time.monthsAgo": "{n} month ago|{n} months ago",
} as const;

const ru: Record<keyof typeof en, string> = {
  "nav.group.applications": "Ваши заявки",
  "nav.group.people": "Люди и компании",
  "nav.group.files": "Файлы и заметки",
  "nav.group.review": "Обзор",

  "nav.label.today": "Сегодня",
  "nav.desc.today": "Что вашего сейчас, что впереди и кого вы ждёте.",
  "nav.label.roles": "Роли",
  "nav.desc.roles":
    "Роли, за которые можно взяться: от рекрутера или найденные самостоятельно; откликнуться или отказаться.",
  "nav.label.applications": "Заявки",
  "nav.desc.applications": "Все заявки списком с фильтрами или доской.",
  "nav.label.recruiters": "Рекрутеры",
  "nav.desc.recruiters": "Агентства и рекрутеры, их контакты и предложенные роли.",
  "nav.label.companies": "Компании",
  "nav.desc.companies": "Компании, их роли и с кем вы говорили.",
  "nav.label.interviews": "Собеседования",
  "nav.desc.interviews": "Собеседования и тестовые задания: расписание, подготовка и разбор.",
  "nav.label.offers": "Офферы",
  "nav.desc.offers": "Офферы рядом: зарплата, бонус, опционы, пенсия, дневная ставка и IR35.",
  "nav.label.documents": "Документы",
  "nav.desc.documents": "Версии резюме и сопроводительных писем — и куда каждое ушло.",
  "nav.label.notes": "Заметки",
  "nav.desc.notes": "Markdown-заметки о чём угодно, плюс общие заметки.",
  "nav.label.insights": "Аналитика",
  "nav.desc.insights": "Диаграмма Санки по вашей воронке, конверсии и карточки рекрутеров.",
  "nav.label.timeline": "Таймлайн",
  "nav.desc.timeline":
    "Всё, что происходило: по дням или одной строкой на роль — звонки, отклики, заявки и итоги.",

  "shell.mainNav": "Основная навигация",
  "shell.toggleNav": "Показать меню",
  "shell.wordmarkAria": "Job Application Tracker: сегодня",
  "shell.language": "Язык",
  "shell.switchMode": "Переключить на {mode} тему",
  "shell.modeLight": "светлую",
  "shell.modeDark": "тёмную",

  "shell.search": "Искать везде",

  "shell.newApplication": "Новая заявка",

  "shell.howItWorks": "Как это работает",
  "shell.how.s1.title": "Добавьте заявку",
  "shell.how.s1.a": "Нажмите ",
  "shell.how.s1.bold": "Новая заявка",
  "shell.how.s1.b":
    " (справа вверху, на любой странице). Введите компанию и роль. Если заявку принёс рекрутер, выберите ",
  "shell.how.s1.italic": "Через рекрутера",
  "shell.how.s1.c":
    " и введите агентство и его имя. Всё новое создаётся автоматически, так что сначала заводить компании и рекрутеров не нужно.",
  "shell.how.s2.title": "Двигайте её дальше",
  "shell.how.s2.a": "Перетаскивайте её по доске на ",
  "shell.how.s2.bold": "Заявках",
  "shell.how.s2.b":
    " или используйте кнопки стадий на её странице — по мере откликов, ответов и собеседований.",
  "shell.how.s3.title": "Записывайте, что происходит",
  "shell.how.s3.a":
    "На странице заявки: звонки, письма, заметки, собеседования, офферы и файлы. Когда ответили и мяч на их стороне, нажмите ",
  "shell.how.s3.bold": "Ответил, жду",
  "shell.how.s4.title": "Начните со страницы «Сегодня»",
  "shell.how.s4.a": "",
  "shell.how.s4.bold1": "Ваш ход",
  "shell.how.s4.b": " — что делать сейчас (ответы на прочтение, напоминания, ваши задачи), ",
  "shell.how.s4.bold2": "Скоро",
  "shell.how.s4.c": " — что уже назначено, а ",
  "shell.how.s4.bold3": "Ждём их",
  "shell.how.s4.d": " — кого пора пинать.",
  "shell.how.s5.title": "Смотрите назад",
  "shell.how.s5.a": "",
  "shell.how.s5.bold1": "Таймлайн",
  "shell.how.s5.b":
    " показывает всё, что происходило: по дням или одной строкой на роль — от первого звонка до итога; ",
  "shell.how.s5.bold2": "Аналитика",
  "shell.how.s5.c": " показывает, как идёт поиск, в том числе какая версия резюме работает лучше.",
  "shell.how.tail.a": "Кто-то написал без конкретной роли? Добавьте его на ",
  "shell.how.tail.bold1": "Рекрутерах",
  "shell.how.tail.b": " (рекрутеры агентств) или на странице компании (люди, которые там работают), затем ",
  "shell.how.tail.bold2": "Назначьте звонок",
  "shell.how.tail.c": " на его странице. После звонка добавьте упомянутые роли и решите по каждой на ",
  "shell.how.tail.bold3": "Ролях",
  "shell.how.tail.d": ".",

  "shell.localFirst": "Локально · данные остаются на этой машине",
  "shell.backup": "Скачать бэкап",
  "shell.backupHint":
    "Всё в одном zip: данные, заметки и файлы. Распакуйте и запустите `jat init` на папке (он соберёт всё заново).",

  "shell.api.checking": "Подключение…",
  "shell.api.checkingHint": "Проверяем локальный API",
  "shell.api.offline": "API недоступен",
  "shell.api.offlineHint": "Запустите его: `uv run jat serve`",
  "shell.api.connected": "Подключено",
  "shell.api.version": "v{version} · схема {schema}",
  "shell.api.backups": " · бэкапы включены",
  "shell.api.noGitRepo": " · каталог данных не git-репозиторий",

  "shell.comingSoon": "Скоро",
  "shell.roadmapTask": "Задача из роадмапа",

  "time.today": "сегодня",
  "time.yesterday": "вчера",
  "time.daysAgo": "{n} день назад|{n} дня назад|{n} дней назад",
  "time.weeksAgo": "{n} неделю назад|{n} недели назад|{n} недель назад",
  "time.monthsAgo": "{n} месяц назад|{n} месяца назад|{n} месяцев назад",
};

export { en, ru };
