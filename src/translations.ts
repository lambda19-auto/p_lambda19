export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    nav: {
      about: "О нас",
      benefits: "Преимущества",
      process: "Процесс",
      demo: "Демо",
    },
    hero: {
      badge: "Интеграция AI-агентов v1.0.0",
      title1: "Автоматизируйте",
      title2: "с Интеллектом.",
      description: "Мы проектируем и внедряем автономных AI-агентов, которые управляют сложными бизнес-процессами, сокращая операционные расходы до 70% при сохранении точности на человеческом уровне.",
      ctaPrimary: "Начать автоматизацию",
      ctaSecondary: "Смотреть демо",
    },
    stats: {
      work: "Бесперебойная работа",
      scale: "Масштабируемость",
      accuracy: "Точность операций",
      roi: "Быстрая окупаемость",
    },
    benefits: {
      title: "Преимущества AI-агентов",
      subtitle: "Наши агенты созданы специально для конкретных бизнес-сфер, обучены на ваших данных и интегрированы напрямую в ваш рабочий процесс.",
      cards: [
        { title: "Когнитивный рабочий процесс", description: "Агенты, которые понимают контекст и принимают решения на основе сложной бизнес-логики и исторических данных." },
        { title: "Обработка данных", description: "Автоматическое извлечение, очистка и синхронизация данных между разрозненными системами без ручного ввода." },
        { title: "Контроль соответствия", description: "Агенты мониторинга в реальном времени, гарантирующие соответствие каждого автоматизированного действия нормативным стандартам." },
        { title: "Мультиагентная сеть", description: "Оркестрация нескольких агентов для совместной работы над бизнес-цепочками." },
        { title: "Кастомная интеграция", description: "Создание агентов под ваши процессы и инфраструктуру." },
        { title: "Прогнозная аналитика", description: "Агенты, которые не просто действуют, но и прогнозируют будущие узкие места и предлагают оптимизацию." },
      ]
    },
    process: {
      title: "Рабочий процесс lambda19",
      steps: [
        { number: "01", title: "Исследование процессов", text: "Мы анализируем ваши текущие рабочие процессы для выявления наиболее эффективных возможностей автоматизации." },
        { number: "02", title: "Обучение агентов", text: "Кастомные модели обучаются на ваших специфических бизнес-правилах и данных." },
        { number: "03", title: "Бесшовная интеграция", text: "Агенты развертываются через API или нативные коннекторы в ваш текущий стек технологий." },
        { number: "04", title: "Постоянная оптимизация", text: "Наши системы способны дообучаться, со временем становясь всё эффективнее." },
      ]
    },
    demos: {
      title: "Демо-проекты",
      subtitle: "Примеры реализованных архитектур и прототипов AI-агентов в различных сферах.",
      projects: [
        { title: "travelai", description: "Умный планировщик на базе AI, подбирающий идеальные направления на основе бюджета, сезона и предпочтений в режиме реального времени." },
        { title: "Lisa Atomy", description: "Персональный ИИ-консультант, отвечающий на вопросы на основе экспертной базы знаний Atomy с использованием современных LLM." },
        { title: "Choa", description: "Финансовый помощник, способный анализировать данные, генерировать идеи и даже создавать видео-объяснения на основе аватара." },
      ]
    },
    cta: {
      title: "Готовы к эволюции?",
      subtitle: "Присоединяйтесь к компаниям, которые трансформировали свои процессы с помощью AI-агентов.",
    },
    footer: {
      desc: "Автоматизация бизнеса нового поколения с помощью AI-агентов и интеграции интеллектуальных рабочих процессов.",
      product: "Продукт",
      company: "Компания",
      agents: "Агенты",
      integrations: "Интеграции",
      security: "Безопасность",
      about: "О нас",
      privacy: "Приватность",
      contacts: "Контакты",
      rights: "Все права защищены.",
      admin: "Админ-панель",
    },
    contact: {
      name: "Имя",
      namePlaceholder: "Иван Иванов",
      contact: "Контакт",
      contactPlaceholder: "@telegram или email",
      task: "Кратко о задаче",
      taskPlaceholder: "Опишите ваш процесс, который нужно автоматизировать...",
      submit: "Разработать AI-решение",
      askAI: "Спросить у AI",
      submitSuccessTitle: "Заявка успешно отправлена!",
      submitSuccessDesc: "Спасибо! Наши инженеры уже анализируют ваш запрос и свяжутся с вами в ближайшее время.",
    },
    agentsPage: {
      back: "Вернуться на главную",
      title: "Каталог AI-агентов",
      subtitle: "Мы проектируем специализированных агентов под любые бизнес-задачи. Ниже представлены примеры решений, которые мы можем интегрировать в вашу инфраструктуру.",
      notFoundTitle: "Не нашли нужного агента?",
      notFoundDesc: "Мы разрабатываем кастомные решения под уникальные процессы. Опишите вашу задачу, и мы спроектируем агента специально для вас.",
      list: [
        { title: "AI-ассистент", description: "Персональный помощник для автоматизации рутинных задач, планирования и управления информацией внутри компании." },
        { title: "AI-консультант", description: "Экспертная система, обученная на вашей базе знаний, предоставляющая мгновенные ответы клиентам и сотрудникам." },
        { title: "AI-контент-мейкер", description: "Генерация текстов, постов и маркетинговых материалов в стиле вашего бренда на основе актуальных данных." },
        { title: "AI-контроль качества", description: "Автоматический мониторинг звонков, переписки и процессов на соответствие стандартам и регламентам." },
        { title: "AI-экзаменатор", description: "Система тестирования и оценки знаний сотрудников с адаптивной сложностью и мгновенной обратной связью." },
        { title: "AI-HR", description: "Автоматизация подбора персонала: от первичного скрининга резюме до проведения вводных интервью." },
        { title: "AI-тех.поддержка", description: "Решение технических инцидентов первого уровня и классификация сложных заявок в режиме 24/7." },
        { title: "AI-трафиколог", description: "Оптимизация рекламных кампаний и распределение бюджета на основе прогнозов эффективности в реальном времени." },
        { title: "AI-куратор", description: "Сопровождение студентов или сотрудников в процессе обучения, контроль прогресса и мотивация." },
      ]
    },
    integrationsPage: {
      title: "Решения по интеграции",
      subtitle: "Мы не просто создаем интеллект, мы встраиваем его в вашу экосистему. Выберите формат, который лучше всего подходит вашему бизнесу.",
      list: [
        { title: "AI-агент на ваш сайт", description: "Бесшовная интеграция интеллектуального помощника в ваш существующий веб-ресурс через легкий JS-виджет.", features: ["Установка за 5 минут", "Полная кастомизация под бренд", "Доступ к базе знаний сайта", "Сбор лидов и аналитика"] },
        { title: "AI веб-сервис под ключ", description: "Разработка современного веб-приложения, где AI-агент является центральным элементом пользовательского опыта.", features: ["Уникальный дизайн интерфейса", "Глубокая интеграция логики", "Высокая производительность", "SEO-оптимизация"] },
        { title: "Боты для мессенджеров", description: "Создание мощных ботов для Telegram, WhatsApp или Slack для работы с клиентами или внутрикорпоративных задач.", features: ["Поддержка групповых чатов", "Интеграция с CRM/ERP", "Мультимедийный контент", "Безопасная передача данных"] },
      ],
      ctaTitle: "Готовы к внедрению?",
      ctaDesc: "Оставьте заявку, и наши инженеры помогут подобрать оптимальную архитектуру интеграции для вашего проекта.",
    },
    securityPage: {
      badge: "Стандарты безопасности",
      title: "Безопасность lambda19",
      subtitle: "Мы понимаем критическую важность защиты данных в эпоху AI. Наши протоколы безопасности интегрированы в каждый этап жизненного цикла разработки агентов.",
      list: [
        { title: "Разграничение прав доступа", description: "Строгая ролевая модель доступа (RBAC) гарантирует, что каждый агент и сотрудник имеет доступ только к необходимым данным." },
        { title: "Изоляция сред", description: "Разделение сред разработки, тестирования и продакшена исключает риск утечки данных или случайного изменения боевых систем." },
        { title: "Шифрование данных", description: "Все данные шифруются при передаче (TLS 1.3) обеспечивая максимальную защиту конфиденциальной информации." },
        { title: "Валидация вывода модели", description: "Многоуровневая проверка ответов AI-агентов на соответствие этическим нормам, бизнес-правилам и безопасности." },
        { title: "Аудит и логирование", description: "Полное протоколирование всех действий агентов и обращений к API для оперативного мониторинга и расследования инцидентов." },
        { title: "Тестирование", description: "Проведение тестов на проникновение и аудит кода для выявления и устранения потенциальных уязвимостей." },
      ],
      bottomTitle: "Ваши данные — ваш актив",
      bottomDesc: "Мы не используем ваши корпоративные данные для обучения публичных моделей. Вся информация остается внутри вашего защищенного контура.",
    },
    privacyPage: {
      title: "Политика конфиденциальности",
      sections: [
        { title: "1. Общие положения", content: "Настоящая политика конфиденциальности описывает, как lambda19 собирает, использует и защищает вашу информацию при использовании наших услуг и AI-агентов. Мы стремимся обеспечить максимальную прозрачность в вопросах обработки данных." },
        { title: "2. Сбор и использование данных", content: "Мы собираем только те данные, которые необходимы для функционирования наших AI-решений и улучшения качества обслуживания:", list: ["Контактная информация (имя, email, телефон) для связи и поддержки.", "Технические данные (IP-адрес, тип браузера) для обеспечения безопасности систем.", "Данные взаимодействий с AI-агентами для их калибровки и повышения точности ответов."] },
        { title: "3. Защита корпоративной информации", content: "Важное примечание: lambda19 не использует ваши конфиденциальные корпоративные данные или данные ваших клиентов для обучения публичных моделей искусственного интеллекта. Все данные остаются в рамках вашего изолированного контура." },
        { title: "4. Передача данных третьим лицам", content: "Мы не продаем и не передаем вашу личную информацию третьим лицам, за исключением случаев, предусмотренных законодательством или необходимых для предоставления услуг (например, использование API провайдеров больших языковых моделей с соблюдением условий конфиденциальности)." },
        { title: "5. Ваши права", content: "Вы имеете право на доступ к своим данным, их исправление или удаление. По любым вопросам, связанным с вашей конфиденциальностью, вы можете связаться с нами через форму обратной связи." },
      ],
      update: "Последнее обновление: Февраль 2026",
    },
    contactsPage: {
      title: "Свяжитесь с нами",
      subtitle: "Мы всегда открыты для новых проектов и обсуждения будущего AI-автоматизации. Выберите удобный способ связи или оставьте заявку через форму.",
      officeTitle: "Наш офис",
      locationTitle: "Локация",
      locationDesc: "Мы работаем по всему миру, но наше сердце находится в цифровом пространстве.",
      supportTitle: "Поддержка",
      supportDesc: "Наш AI-консультант доступен 24/7 для мгновенных ответов на ваши вопросы.",
      quote: "Мы верим, что эффективная коммуникация — это первый шаг к успешной автоматизации.",
      formTitle: "Оставить заявку",
      formDesc: "Опишите вашу задачу, и мы свяжемся с вами в течение рабочего дня для детального обсуждения.",
    },
    chat: {
      welcome: "Здравствуйте! Я AI-консультант lambda19. Чем я могу помочь вам в автоматизации вашего бизнеса сегодня?",
      placeholder: "Спросите об AI-автоматизации...",
      title: "AI-консультант",
      status: "lambda19 в сети",
      error: "Я столкнулся с ошибкой. Пожалуйста, попробуйте позже.",
      system: `Вы — AI-консультант компании lambda19, специализирующейся на AI-агентах и автоматизации бизнес-процессов.
Ваш тон профессиональный, технический и ориентированный на будущее.
Ключевая информация о lambda19:
- Мы создаем кастомных AI-агентов для конкретных бизнес-процессов (например, автоматизированная поддержка клиентов, обработка документов, продажи).
- Мы интегрируем этих агентов в существующие стеки технологий (Slack, CRM, ERP).
- Наша философия: "Автоматизация с интеллектом".
- Если спрашивают о ценах, предлагайте консультацию, так как каждый проект уникален.
- Отвечайте кратко и по существу на русском языке.`,
    },
    auth: {
      title: "Вход в панель управления",
      subtitle: "Авторизуйтесь для доступа к лидам и настройкам агентов",
      username: "Имя пользователя",
      usernamePlaceholder: "Введите логин",
      password: "Пароль",
      passwordPlaceholder: "Введите пароль",
      submit: "Войти в систему",
      errorInvalid: "Неверный логин или пароль",
      errorGeneric: "Ошибка авторизации. Попробуйте позже.",
      loading: "Вход...",
      credentialsHint: "Используйте учётные данные, заданные администратором.",
    }
  },
  en: {
    nav: {
      about: "About Us",
      benefits: "Benefits",
      process: "Process",
      demo: "Demo",
    },
    hero: {
      badge: "AI Agent Integration v1.0.0",
      title1: "Automate",
      title2: "with Intelligence.",
      description: "We design and implement autonomous AI agents that manage complex business processes, reducing operational costs by up to 70% while maintaining human-level accuracy.",
      ctaPrimary: "Start Automation",
      ctaSecondary: "Watch Demo",
    },
    stats: {
      work: "Uninterrupted Work",
      scale: "Scalability",
      accuracy: "Operation Accuracy",
      roi: "Fast ROI",
    },
    benefits: {
      title: "Benefits of AI Agents",
      subtitle: "Our agents are custom-built for specific business domains, trained on your data, and integrated directly into your workflow.",
      cards: [
        { title: "Cognitive Workflow", description: "Agents that understand context and make decisions based on complex business logic and historical data." },
        { title: "Data Processing", description: "Automatic extraction, cleaning, and synchronization of data across disparate systems without manual entry." },
        { title: "Compliance Control", description: "Real-time monitoring agents ensuring every automated action meets regulatory standards." },
        { title: "Multi-Agent Network", description: "Orchestration of multiple agents to work together on business chains." },
        { title: "Custom Integration", description: "Creating agents tailored to your processes and infrastructure." },
        { title: "Predictive Analytics", description: "Agents that don't just act, but also predict future bottlenecks and suggest optimizations." },
      ]
    },
    process: {
      title: "lambda19 Workflow",
      steps: [
        { number: "01", title: "Process Discovery", text: "We analyze your current workflows to identify the most effective automation opportunities." },
        { number: "02", title: "Agent Training", text: "Custom models are trained on your specific business rules and data." },
        { number: "03", title: "Seamless Integration", text: "Agents are deployed via APIs or native connectors into your current tech stack." },
        { number: "04", title: "Continuous Optimization", text: "Our systems are capable of learning, becoming more efficient over time." },
      ]
    },
    demos: {
      title: "Demo Projects",
      subtitle: "Examples of implemented architectures and AI agent prototypes for various industries.",
      projects: [
        { title: "travelai", description: "Smart AI-powered planner that finds ideal destinations based on budget, season, and preferences in real-time." },
        { title: "Lisa Atomy", description: "Personal AI consultant answering questions based on Atomy's expert knowledge base using modern LLMs." },
        { title: "Choa", description: "Financial assistant capable of analyzing data, generating insights, and even creating video explanations based on an avatar." },
      ]
    },
    cta: {
      title: "Ready for Evolution?",
      subtitle: "Join the many companies that have transformed their operations with AI agents.",
    },
    footer: {
      desc: "Next-generation business automation using neural agents and cognitive workflow integration.",
      product: "Product",
      company: "Company",
      agents: "Agents",
      integrations: "Integrations",
      security: "Security",
      about: "About Us",
      privacy: "Privacy",
      contacts: "Contacts",
      rights: "All rights reserved.",
      admin: "Admin Panel",
    },
    contact: {
      name: "Name",
      namePlaceholder: "John Doe",
      contact: "Contact",
      contactPlaceholder: "@telegram or email",
      task: "Task Summary",
      taskPlaceholder: "Describe your process that needs automation...",
      submit: "Develop AI Solution",
      askAI: "Ask AI",
      submitSuccessTitle: "Request sent successfully!",
      submitSuccessDesc: "Thank you! Our engineers are already analyzing your request and will contact you shortly.",
    },
    agentsPage: {
      back: "Back to Home",
      title: "AI Agent Catalog",
      subtitle: "We design specialized agents for any business task. Below are examples of solutions we can integrate into your infrastructure.",
      notFoundTitle: "Didn't find the right agent?",
      notFoundDesc: "We develop custom solutions for unique processes. Describe your task, and we'll design an agent specifically for you.",
      list: [
        { title: "AI Assistant", description: "Personal assistant for automating routine tasks, scheduling, and information management within the company." },
        { title: "AI Consultant", description: "Expert system trained on your knowledge base, providing instant answers to customers and employees." },
        { title: "AI Content Maker", description: "Generation of texts, posts, and marketing materials in your brand style based on current data." },
        { title: "AI Quality Control", description: "Automatic monitoring of calls, correspondence, and processes for compliance with standards and regulations." },
        { title: "AI Examiner", description: "Testing and knowledge assessment system for employees with adaptive difficulty and instant feedback." },
        { title: "AI HR", description: "Automation of recruitment: from initial resume screening to introductory interviews." },
        { title: "AI Tech Support", description: "Solving first-level technical incidents and classifying complex requests 24/7." },
        { title: "AI Trafficker", description: "Optimization of advertising campaigns and budget allocation based on real-time performance forecasts." },
        { title: "AI Curator", description: "Supporting students or employees during the learning process, monitoring progress, and providing motivation." },
      ]
    },
    integrationsPage: {
      title: "Integration Solutions",
      subtitle: "We don't just create intelligence, we embed it into your ecosystem. Choose the format that best fits your business.",
      list: [
        { title: "AI Agent for your site", description: "Seamless integration of an intelligent assistant into your existing web resource via a lightweight JS widget.", features: ["5-minute installation", "Full brand customization", "Site knowledge base access", "Lead collection and analytics"] },
        { title: "Turnkey AI Web Service", description: "Development of a modern web application where an AI agent is a central element of the user experience.", features: ["Unique interface design", "Deep logic integration", "High performance", "SEO optimization"] },
        { title: "Messenger Bots", description: "Creating powerful bots for Telegram, WhatsApp, or Slack for customer service or internal tasks.", features: ["Group chat support", "CRM/ERP integration", "Multimedia content", "Secure data transfer"] },
      ],
      ctaTitle: "Ready for deployment?",
      ctaDesc: "Leave a request, and our engineers will help select the optimal integration architecture for your project.",
    },
    securityPage: {
      badge: "Security Standards",
      title: "lambda19 Security",
      subtitle: "We understand the critical importance of data protection in the AI era. Our security protocols are integrated into every stage of the agent development lifecycle.",
      list: [
        { title: "Access Control", description: "A strict Role-Based Access Control (RBAC) model ensures that every agent and employee has access only to necessary data." },
        { title: "Environment Isolation", description: "Separation of development, testing, and production environments eliminates the risk of data leaks or accidental changes to live systems." },
        { title: "Data Encryption", description: "All data is encrypted in transit (TLS 1.3), ensuring maximum protection of confidential information." },
        { title: "Model Output Validation", description: "Multi-layered verification of AI agent responses for compliance with ethical norms, business rules, and security." },
        { title: "Audit and Logging", description: "Complete logging of all agent actions and API requests for real-time monitoring and incident investigation." },
        { title: "Testing", description: "Conducting penetration tests and code audits to identify and eliminate potential vulnerabilities." },
      ],
      bottomTitle: "Your Data is Your Asset",
      bottomDesc: "We do not use your corporate data to train public models. All information remains within your protected perimeter.",
    },
    privacyPage: {
      title: "Privacy Policy",
      sections: [
        { title: "1. General Provisions", content: "This privacy policy describes how lambda19 collects, uses, and protects your information when using our services and AI agents. We strive to provide maximum transparency in data processing matters." },
        { title: "2. Data Collection and Use", content: "We collect only the data necessary for the functioning of our AI solutions and improving service quality:", list: ["Contact information (name, email, phone) for communication and support.", "Technical data (IP address, browser type) to ensure system security.", "AI agent interaction data for their calibration and improving response accuracy."] },
        { title: "3. Corporate Information Protection", content: "Important note: lambda19 does not use your confidential corporate data or your customers' data to train public artificial intelligence models. All data remains within your isolated perimeter." },
        { title: "4. Data Transfer to Third Parties", content: "We do not sell or transfer your personal information to third parties, except as required by law or necessary to provide services (e.g., using API providers of large language models in compliance with privacy terms)." },
        { title: "5. Your Rights", content: "You have the right to access your data, correct it, or delete it. For any questions related to your privacy, you can contact us via the feedback form." },
      ],
      update: "Last Updated: February 2026",
    },
    contactsPage: {
      title: "Contact Us",
      subtitle: "We are always open to new projects and discussing the future of AI automation. Choose a convenient way to contact us or leave a request via the form.",
      officeTitle: "Our Office",
      locationTitle: "Location",
      locationDesc: "We work worldwide, but our heart is in the digital space.",
      supportTitle: "Support",
      supportDesc: "Our AI consultant is available 24/7 for instant answers to your questions.",
      quote: "We believe that effective communication is the first step to successful automation.",
      formTitle: "Leave a Request",
      formDesc: "Describe your task, and we will contact you within one business day for a detailed discussion.",
    },
    chat: {
      welcome: "Hello! I am lambda19's AI consultant. How can I help you automate your business today?",
      placeholder: "Ask about AI automation...",
      title: "AI Consultant",
      status: "lambda19 online",
      error: "I encountered an error. Please try again later.",
      system: `You are an AI consultant for lambda19, a company specializing in AI agents and business process automation.
Your tone is professional, technical, and future-oriented.
Key information about lambda19:
- We create custom AI agents for specific business processes (e.g., automated customer support, document processing, sales).
- We integrate these agents into existing tech stacks (Slack, CRM, ERP).
- Our philosophy: "Automation with Intelligence".
- If asked about pricing, suggest a consultation as each project is unique.
- Respond concisely and to the point in English.`,
    },
    auth: {
      title: "Control Panel Login",
      subtitle: "Authorize to access leads and agent configurations",
      username: "Username",
      usernamePlaceholder: "Enter login",
      password: "Password",
      passwordPlaceholder: "Enter password",
      submit: "Sign In",
      errorInvalid: "Invalid username or password",
      errorGeneric: "Authorization error. Try again later.",
      loading: "Signing in...",
      credentialsHint: "Use the credentials configured by your administrator.",
    }
  }
};
