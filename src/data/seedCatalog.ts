import {
  AssessmentQuestion,
  DifficultyTier,
  JobRole,
  LearningResource,
  ResourceChunk,
  RoleRequirement,
  SkillDefinition,
} from '../types';

export const SEED_SKILLS: SkillDefinition[] = [
  {
    id: 'skill_core_java',
    name: 'Core Java & OOP',
    category: 'Programming Languages',
    description: 'Java syntax, object-oriented design, collections, generics, streams, and JVM memory fundamentals.',
    active: true,
  },
  {
    id: 'skill_spring_boot',
    name: 'Spring Boot & Dependency Injection',
    category: 'Backend Frameworks',
    description: 'Building production Java services with Spring IoC, Spring MVC, Spring Data JPA, and configuration profiles.',
    active: true,
  },
  {
    id: 'skill_sql_databases',
    name: 'SQL & Relational Databases',
    category: 'Data & Persistence',
    description: 'Schema normalization, joins, window functions, indexing, transactions, and query optimization.',
    active: true,
  },
  {
    id: 'skill_rest_apis',
    name: 'RESTful API Design',
    category: 'Backend Architecture',
    description: 'HTTP semantics, status codes, pagination, request validation, authentication, and OpenAPI contracts.',
    active: true,
  },
  {
    id: 'skill_git_vcs',
    name: 'Git & Collaborative Version Control',
    category: 'Software Engineering',
    description: 'Branching workflows, rebasing, conflict resolution, pull request reviews, and commit hygiene.',
    active: true,
  },
  {
    id: 'skill_junit_testing',
    name: 'Unit & Integration Testing',
    category: 'Quality Assurance',
    description: 'Automated testing with JUnit 5, Mockito, or Pytest, test fixtures, assertions, and boundary testing.',
    active: true,
  },
  {
    id: 'skill_python_core',
    name: 'Python Programming',
    category: 'Programming Languages',
    description: 'Idiomatic Python data structures, comprehensions, iterators, type hints, modules, and packaging.',
    active: true,
  },
  {
    id: 'skill_fastapi_django',
    name: 'FastAPI & Python Web Services',
    category: 'Backend Frameworks',
    description: 'Pydantic data validation, dependency injection, async endpoints, middleware, and ORM integration.',
    active: true,
  },
  {
    id: 'skill_async_python',
    name: 'Asynchronous & Concurrent Python',
    category: 'Programming Languages',
    description: 'Event loops with asyncio, I/O-bound vs CPU-bound concurrency, tasks, and rate-limited HTTP clients.',
    active: true,
  },
  {
    id: 'skill_docker_containers',
    name: 'Docker & Containerization',
    category: 'DevOps & Cloud',
    description: 'Multi-stage Dockerfiles, image layering, environment configuration, and Docker Compose service networks.',
    active: true,
  },
  {
    id: 'skill_pandas_wrangling',
    name: 'Data Wrangling with Pandas',
    category: 'Data Analysis',
    description: 'DataFrames, missing value imputation, groupby aggregations, reshaping, merges, and time-series indexing.',
    active: true,
  },
  {
    id: 'skill_statistics_prob',
    name: 'Exploratory Statistics & Hypothesis Testing',
    category: 'Mathematics & Statistics',
    description: 'Distributions, confidence intervals, p-values, A/B test interpretation, correlation vs causation, and outliers.',
    active: true,
  },
  {
    id: 'skill_data_viz_bi',
    name: 'Data Visualization & BI Dashboards',
    category: 'Data Analysis',
    description: 'Chart selection, visual encoding, KPI definition, cohort views, and dashboard storytelling.',
    active: true,
  },
  {
    id: 'skill_spreadsheets',
    name: 'Spreadsheet Modeling & Pivot Analysis',
    category: 'Data Analysis',
    description: 'Lookup functions, pivot tables, conditional aggregations, data validation, and structured KPI sheets.',
    active: true,
  },
];

export const SEED_JOB_ROLES: JobRole[] = [
  {
    id: 'role_java_developer',
    title: 'Java Developer',
    department: 'Backend Software Engineering',
    description:
      'Designs, builds, and tests maintainable JVM backend microservices, relational persistence layers, and RESTful APIs. Note: Illustrative academic benchmark dataset curated for student career preparation rather than verified live employer hiring criteria.',
    isSampleDataset: true,
    active: true,
    recommendedResourceIds: [
      'res_java_core',
      'res_spring_boot',
      'res_sql_analytics',
      'res_rest_api',
      'res_testing_junit_pytest',
      'res_git_workflow',
    ],
  },
  {
    id: 'role_python_developer',
    title: 'Python Developer',
    department: 'Backend & Platform Engineering',
    description:
      'Develops typed Python backend APIs, asynchronous data pipelines, automated test suites, and containerized services. Note: Illustrative academic benchmark dataset curated for student career preparation rather than verified live employer hiring criteria.',
    isSampleDataset: true,
    active: true,
    recommendedResourceIds: [
      'res_python_core',
      'res_fastapi_services',
      'res_async_python',
      'res_sql_analytics',
      'res_docker_containers',
      'res_testing_junit_pytest',
    ],
  },
  {
    id: 'role_data_analyst',
    title: 'Data Analyst',
    department: 'Analytics & Business Intelligence',
    description:
      'Transforms raw operational datasets into validated insights using SQL queries, Python/Pandas wrangling, statistical inference, and clear visual dashboards. Note: Illustrative academic benchmark dataset curated for student career preparation rather than verified live employer hiring criteria.',
    isSampleDataset: true,
    active: true,
    recommendedResourceIds: [
      'res_sql_analytics',
      'res_pandas_wrangling',
      'res_stats_inference',
      'res_data_viz',
      'res_spreadsheets_bi',
      'res_python_core',
    ],
  },
];

export const SEED_ROLE_REQUIREMENTS: RoleRequirement[] = [
  // 1. Java Developer
  {
    id: 'req_java_core',
    roleId: 'role_java_developer',
    skillId: 'skill_core_java',
    skillName: 'Core Java & OOP',
    category: 'Programming Languages',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_java_spring',
    roleId: 'role_java_developer',
    skillId: 'skill_spring_boot',
    skillName: 'Spring Boot & Dependency Injection',
    category: 'Backend Frameworks',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_java_sql',
    roleId: 'role_java_developer',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    category: 'Data & Persistence',
    requiredProficiency: 3,
    importanceWeight: 4,
    active: true,
  },
  {
    id: 'req_java_rest',
    roleId: 'role_java_developer',
    skillId: 'skill_rest_apis',
    skillName: 'RESTful API Design',
    category: 'Backend Architecture',
    requiredProficiency: 3,
    importanceWeight: 4,
    active: true,
  },
  {
    id: 'req_java_testing',
    roleId: 'role_java_developer',
    skillId: 'skill_junit_testing',
    skillName: 'Unit & Integration Testing',
    category: 'Quality Assurance',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },
  {
    id: 'req_java_git',
    roleId: 'role_java_developer',
    skillId: 'skill_git_vcs',
    skillName: 'Git & Collaborative Version Control',
    category: 'Software Engineering',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },

  // 2. Python Developer
  {
    id: 'req_py_core',
    roleId: 'role_python_developer',
    skillId: 'skill_python_core',
    skillName: 'Python Programming',
    category: 'Programming Languages',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_py_fastapi',
    roleId: 'role_python_developer',
    skillId: 'skill_fastapi_django',
    skillName: 'FastAPI & Python Web Services',
    category: 'Backend Frameworks',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_py_sql',
    roleId: 'role_python_developer',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    category: 'Data & Persistence',
    requiredProficiency: 3,
    importanceWeight: 4,
    active: true,
  },
  {
    id: 'req_py_async',
    roleId: 'role_python_developer',
    skillId: 'skill_async_python',
    skillName: 'Asynchronous & Concurrent Python',
    category: 'Programming Languages',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },
  {
    id: 'req_py_testing',
    roleId: 'role_python_developer',
    skillId: 'skill_junit_testing',
    skillName: 'Unit & Integration Testing',
    category: 'Quality Assurance',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },
  {
    id: 'req_py_docker',
    roleId: 'role_python_developer',
    skillId: 'skill_docker_containers',
    skillName: 'Docker & Containerization',
    category: 'DevOps & Cloud',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },

  // 3. Data Analyst
  {
    id: 'req_da_sql',
    roleId: 'role_data_analyst',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    category: 'Data & Persistence',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_da_pandas',
    roleId: 'role_data_analyst',
    skillId: 'skill_pandas_wrangling',
    skillName: 'Data Wrangling with Pandas',
    category: 'Data Analysis',
    requiredProficiency: 3,
    importanceWeight: 5,
    active: true,
  },
  {
    id: 'req_da_stats',
    roleId: 'role_data_analyst',
    skillId: 'skill_statistics_prob',
    skillName: 'Exploratory Statistics & Hypothesis Testing',
    category: 'Mathematics & Statistics',
    requiredProficiency: 3,
    importanceWeight: 4,
    active: true,
  },
  {
    id: 'req_da_viz',
    roleId: 'role_data_analyst',
    skillId: 'skill_data_viz_bi',
    skillName: 'Data Visualization & BI Dashboards',
    category: 'Data Analysis',
    requiredProficiency: 3,
    importanceWeight: 4,
    active: true,
  },
  {
    id: 'req_da_sheets',
    roleId: 'role_data_analyst',
    skillId: 'skill_spreadsheets',
    skillName: 'Spreadsheet Modeling & Pivot Analysis',
    category: 'Data Analysis',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },
  {
    id: 'req_da_python',
    roleId: 'role_data_analyst',
    skillId: 'skill_python_core',
    skillName: 'Python Programming',
    category: 'Programming Languages',
    requiredProficiency: 2,
    importanceWeight: 3,
    active: true,
  },
];

export const SEED_LEARNING_RESOURCES: LearningResource[] = [
  {
    id: 'res_java_core',
    title: 'Dev.java Official Java Language & Collections Track',
    description: 'Comprehensive guide to modern Java OOP, records, generics, Collections Framework, Streams API, and JVM exception handling.',
    skillCategory: 'Core Java & OOP',
    skillTags: ['Core Java & OOP', 'Java', 'Collections', 'Streams', 'OOP'],
    difficulty: 'Intermediate',
    url: 'https://dev.java/learn/',
    source: 'Oracle Dev.java Documentation',
    estimatedHours: 14,
    searchableContent:
      'Modern Java fundamentals cover classes, interfaces, sealed types, records, and encapsulation. The Java Collections Framework provides ArrayList, LinkedList, HashMap, TreeMap, and HashSet with distinct algorithmic time complexities. Always override equals() and hashCode() together when using custom objects as HashMap keys. The Java Streams API enables declarative pipelines using filter, map, flatMap, and collect(Collectors.groupingBy(...)) without mutating source collections.',
    active: true,
  },
  {
    id: 'res_spring_boot',
    title: 'Spring Academy: Building REST Services with Spring Boot & JPA',
    description: 'Hands-on curriculum covering Spring IoC container, constructor dependency injection, Spring MVC controllers, Bean Validation, and Spring Data JPA transactions.',
    skillCategory: 'Spring Boot & Dependency Injection',
    skillTags: ['Spring Boot & Dependency Injection', 'Spring Data JPA', 'Java', 'RESTful API Design'],
    difficulty: 'Intermediate',
    url: 'https://spring.academy/courses',
    source: 'Spring Academy Official',
    estimatedHours: 16,
    searchableContent:
      'Spring Boot simplifies microservice setup via auto-configuration and starter dependencies. Prefer constructor-based dependency injection over field injection so beans remain immutable and unit-testable without a full container. Annotate service methods with @Transactional to manage database boundaries safely, and watch for the N+1 query issue in Spring Data JPA by using JOIN FETCH or entity graphs. Validate incoming DTOs with @Valid and @ControllerAdvice global exception handlers.',
    active: true,
  },
  {
    id: 'res_sql_analytics',
    title: 'PostgreSQL Tutorial & Analytical SQL Window Functions',
    description: 'Practical relational database design, B-tree indexing, ACID transactions, CTEs, and analytical window functions (ROW_NUMBER, RANK, LAG).',
    skillCategory: 'SQL & Relational Databases',
    skillTags: ['SQL & Relational Databases', 'PostgreSQL', 'Window Functions', 'Indexing'],
    difficulty: 'Intermediate',
    url: 'https://www.postgresql.org/docs/current/tutorial.html',
    source: 'PostgreSQL Official Documentation',
    estimatedHours: 12,
    searchableContent:
      'Relational databases store normalized tables connected by primary and foreign keys. Use INNER JOIN for matching records and LEFT JOIN when retaining unmatched parent rows. Filtering aggregated groups requires HAVING rather than WHERE because WHERE executes before GROUP BY. Window functions such as ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) and SUM() OVER (...) compute rankings and running totals without collapsing individual detail rows. Composite B-tree indexes accelerate selective WHERE and JOIN predicates.',
    active: true,
  },
  {
    id: 'res_rest_api',
    title: 'HTTP & RESTful API Design Best Practices',
    description: 'Designing predictable HTTP APIs with resource-oriented URLs, idempotency, status codes, cursor pagination, and OpenAPI 3.1 schemas.',
    skillCategory: 'RESTful API Design',
    skillTags: ['RESTful API Design', 'HTTP', 'OpenAPI', 'Backend Architecture'],
    difficulty: 'Intermediate',
    url: 'https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design',
    source: 'Microsoft Architecture Center',
    estimatedHours: 8,
    searchableContent:
      'RESTful APIs model nouns as resource collections (/orders, /users/{id}/assessments) and use HTTP methods for semantics: GET (safe, idempotent), PUT (idempotent replacement), PATCH (partial update), POST (creation or non-idempotent action), and DELETE. Return accurate HTTP status codes: 200 OK, 201 Created, 400 Bad Request for validation errors, 401 Unauthorized for missing authentication, 403 Forbidden for insufficient permissions, and 404 Not Found. Protect large list endpoints with limit/cursor pagination.',
    active: true,
  },
  {
    id: 'res_testing_junit_pytest',
    title: 'Automated Unit & Integration Testing with JUnit 5 and Pytest',
    description: 'Writing deterministic unit tests, parameterized test cases, test doubles/mocks, and database integration tests.',
    skillCategory: 'Unit & Integration Testing',
    skillTags: ['Unit & Integration Testing', 'JUnit 5', 'Mockito', 'Pytest'],
    difficulty: 'Intermediate',
    url: 'https://junit.org/junit5/docs/current/user-guide/',
    source: 'JUnit 5 & Pytest Guides',
    estimatedHours: 9,
    searchableContent:
      'Effective automated tests follow Arrange-Act-Assert structure and verify behavior across happy paths, empty inputs, and boundary conditions. In Java, JUnit 5 (@Test, @ParameterizedTest) pairs with Mockito (@Mock, when(...).thenReturn(...)) to isolate external dependencies. In Python, Pytest uses fixtures (@pytest.fixture) and monkeypatch to inject clean test state. Complement fast unit tests with integration tests against ephemeral test databases to catch SQL and serialization mismatches.',
    active: true,
  },
  {
    id: 'res_git_workflow',
    title: 'Pro Git: Branching Strategies, Pull Requests & Conflict Resolution',
    description: 'Mastering feature branches, interactive staging, rebasing vs merging, git bisect debugging, and clean commit history.',
    skillCategory: 'Git & Collaborative Version Control',
    skillTags: ['Git & Collaborative Version Control', 'Git', 'Code Review'],
    difficulty: 'Beginner',
    url: 'https://git-scm.com/book/en/v2',
    source: 'Pro Git Open Textbook',
    estimatedHours: 6,
    searchableContent:
      'Git tracks content snapshots via SHA hashes. Create short-lived feature branches off main, write atomic commits with clear imperative messages, and open pull requests for peer review. Understand the difference between git merge (preserves branch topology with a merge commit) and git rebase (replays commits linearly—never rebase shared public history). Inspect changes before committing with git diff --staged and recover mistakes safely using git reflog.',
    active: true,
  },
  {
    id: 'res_python_core',
    title: 'Official Python 3 Tutorial: Data Structures, Typing & Modules',
    description: 'Core Python fluency including list/dict comprehensions, generators, context managers, pathlib, virtual environments, and type annotations.',
    skillCategory: 'Python Programming',
    skillTags: ['Python Programming', 'Type Hints', 'Generators', 'Standard Library'],
    difficulty: 'Beginner',
    url: 'https://docs.python.org/3/tutorial/',
    source: 'Python Software Foundation',
    estimatedHours: 12,
    searchableContent:
      'Python emphasizes readable, modular code. Master built-in dicts, sets, tuples, and list comprehensions, while avoiding mutable default arguments (such as def append_item(x, items=[])) which persist state across calls. Use generators (yield) to process large files lazily in constant memory, context managers (with open(...)) for deterministic resource cleanup, venv for isolated dependencies, and typing annotations for static verification.',
    active: true,
  },
  {
    id: 'res_fastapi_services',
    title: 'FastAPI Official User Guide: Pydantic Models & Dependency Injection',
    description: 'Building high-throughput Python APIs with Pydantic v2 schemas, automatic OpenAPI docs, dependency injection, and SQLAlchemy sessions.',
    skillCategory: 'FastAPI & Python Web Services',
    skillTags: ['FastAPI & Python Web Services', 'Pydantic', 'RESTful API Design', 'Python'],
    difficulty: 'Intermediate',
    url: 'https://fastapi.tiangolo.com/tutorial/',
    source: 'FastAPI Documentation',
    estimatedHours: 14,
    searchableContent:
      'FastAPI leverages Python type hints and Pydantic BaseModel classes to validate request bodies, query parameters, and response schemas automatically while generating interactive OpenAPI documentation. Use Depends() to inject database sessions, current authenticated user context, and rate limiters cleanly—making dependencies effortless to override in Pytest via app.dependency_overrides.',
    active: true,
  },
  {
    id: 'res_async_python',
    title: 'Python Asyncio & Concurrency in Practice',
    description: 'Event loops, async/await coroutines, asyncio.gather, connection pooling, and avoiding blocking calls in async handlers.',
    skillCategory: 'Asynchronous & Concurrent Python',
    skillTags: ['Asynchronous & Concurrent Python', 'asyncio', 'Concurrency'],
    difficulty: 'Advanced',
    url: 'https://docs.python.org/3/library/asyncio.html',
    source: 'Python Standard Library Docs',
    estimatedHours: 10,
    searchableContent:
      'Python asyncio executes cooperative multitasking on a single-threaded event loop, making it ideal for I/O-bound workloads like concurrent HTTP requests (httpx.AsyncClient) or async database queries. Schedule independent coroutines concurrently with asyncio.gather() or TaskGroup, bound concurrency with asyncio.Semaphore, and never call blocking synchronous functions like time.sleep() or synchronous requests inside an async def coroutine without offloading to asyncio.to_thread().',
    active: true,
  },
  {
    id: 'res_docker_containers',
    title: 'Docker Curriculum: Multi-Stage Builds & Compose Networks',
    description: 'Containerizing backend applications with minimal base images, layer caching, non-root users, and multi-container Docker Compose setups.',
    skillCategory: 'Docker & Containerization',
    skillTags: ['Docker & Containerization', 'Containers', 'DevOps'],
    difficulty: 'Beginner',
    url: 'https://docs.docker.com/get-started/',
    source: 'Docker Official Docs',
    estimatedHours: 8,
    searchableContent:
      'Containers package application code alongside exact OS/runtime dependencies. Order Dockerfile instructions from least-frequently changed (COPY package.json / requirements.txt and install) to most-frequently changed (COPY src/) to maximize build layer cache hits. Use multi-stage builds to exclude compilers from production images, include a .dockerignore file, run processes as a non-root user, and orchestrate local databases + APIs with docker compose up.',
    active: true,
  },
  {
    id: 'res_pandas_wrangling',
    title: 'Pandas User Guide: Data Cleaning, GroupBy & Time-Series Analysis',
    description: 'Vectorized DataFrame transformations, handling missing data, merging relational datasets, pivot tables, and datetime resampling.',
    skillCategory: 'Data Wrangling with Pandas',
    skillTags: ['Data Wrangling with Pandas', 'Pandas', 'NumPy', 'Data Cleaning'],
    difficulty: 'Intermediate',
    url: 'https://pandas.pydata.org/docs/user_guide/index.html',
    source: 'PyData Pandas Documentation',
    estimatedHours: 14,
    searchableContent:
      'Pandas DataFrames enable fast vectorized operations over tabular data—avoid row-by-row Python loops (.iterrows()) when vectorized boolean masks or .loc[] assignments work. Audit data quality first with .info(), .isna().sum(), and .duplicated(). Handle missing values deliberately (median/group imputation or explicit missing flags rather than blind dropping), validate cardinality before pd.merge() to avoid unintended row multiplication, and aggregate metrics with .groupby(...).agg(...).',
    active: true,
  },
  {
    id: 'res_stats_inference',
    title: 'OpenIntro Statistics: Distributions, Confidence Intervals & Hypothesis Testing',
    description: 'Foundational applied statistics for data analysts: skewed distributions, Central Limit Theorem, two-sample t-tests, chi-square tests, and A/B testing pitfalls.',
    skillCategory: 'Exploratory Statistics & Hypothesis Testing',
    skillTags: ['Exploratory Statistics & Hypothesis Testing', 'Statistics', 'A/B Testing'],
    difficulty: 'Intermediate',
    url: 'https://www.openintro.org/book/os/',
    source: 'OpenIntro Statistics Textbook',
    estimatedHours: 15,
    searchableContent:
      'When analyzing skewed distributions (such as order values or latency), report median and interquartile range (IQR) alongside mean and standard deviation so extreme outliers do not distort summaries. A p-value measures the probability of observing test results at least as extreme as the sample assuming the null hypothesis is true—it is NOT the probability that the null hypothesis is true. Always pair statistical significance with practical effect size and confidence intervals.',
    active: true,
  },
  {
    id: 'res_data_viz',
    title: 'Fundamentals of Data Visualization & Analytical Storytelling',
    description: 'Selecting honest chart types, perceptual hierarchy, cohort retention heatmaps, and executive KPI dashboard design.',
    skillCategory: 'Data Visualization & BI Dashboards',
    skillTags: ['Data Visualization & BI Dashboards', 'Charts', 'Business Intelligence'],
    difficulty: 'Beginner',
    url: 'https://clauswilke.com/dataviz/',
    source: 'Claus O. Wilke Open Visualization Guide',
    estimatedHours: 9,
    searchableContent:
      'Match visual encodings to analytical questions: bar charts (always starting at a zero baseline) for categorical magnitude comparisons, line charts for continuous time-series trends, scatter plots for bivariate relationships, and box/violin plots for distribution spread. Label axes with explicit units and timeframes, highlight actionable comparisons rather than decorative 3D effects, and pair color encodings with direct labels for color-vision accessibility.',
    active: true,
  },
  {
    id: 'res_spreadsheets_bi',
    title: 'Structured Spreadsheet Modeling, XLOOKUP & Pivot Table Analytics',
    description: 'Building auditable analytical models with XLOOKUP/INDEX-MATCH, SUMIFS, Pivot Tables, and data validation rules.',
    skillCategory: 'Spreadsheet Modeling & Pivot Analysis',
    skillTags: ['Spreadsheet Modeling & Pivot Analysis', 'Excel', 'Google Sheets', 'Pivot Tables'],
    difficulty: 'Beginner',
    url: 'https://support.google.com/docs/topic/9054603',
    source: 'Spreadsheet Analytics Reference',
    estimatedHours: 7,
    searchableContent:
      'Separate raw immutable data tabs, calculation tabs, and summary dashboard tabs in analytical workbooks. Prefer XLOOKUP or INDEX/MATCH over VLOOKUP so column insertions never break formula offsets. Use SUMIFS and COUNTIFS for multi-criteria aggregations, Pivot Tables for rapid cross-tabulation by region/cohort/month, and strict data validation rules to prevent inconsistent category strings.',
    active: true,
  },
];

/**
 * Cleans and splits a LearningResource into overlapping ~360-character semantic chunks
 * while retaining full source attribution metadata (Section 11).
 */
export function chunkLearningResource(resource: LearningResource): ResourceChunk[] {
  const cleaned = `${resource.title}. ${resource.description} ${resource.searchableContent}`
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= 360 || current.length === 0) {
      current = (current + ' ' + sentence).trim();
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) {
    chunks.push(current);
  }

  return chunks.slice(0, 12).map((text, idx) => ({
    id: `${resource.id}_chunk_${idx}`,
    resourceId: resource.id,
    resourceTitle: resource.title.slice(0, 240),
    skillCategory: resource.skillCategory.slice(0, 120),
    difficulty: resource.difficulty,
    source: resource.source.slice(0, 160),
    url: resource.url.slice(0, 512),
    chunkIndex: idx,
    chunkText: text.slice(0, 2800),
    active: resource.active,
  }));
}

export const SEED_RESOURCE_CHUNKS: ResourceChunk[] = SEED_LEARNING_RESOURCES.flatMap((res) =>
  chunkLearningResource(res)
);

export const SKILL_ASSESSMENT_BANK: AssessmentQuestion[] = [
  // Core Java
  {
    id: 'q_java_1',
    skillId: 'skill_core_java',
    skillName: 'Core Java & OOP',
    difficulty: 'Intermediate',
    prompt: 'When using a custom Java class as a key in a HashMap, which contract must be satisfied to prevent lost lookups?',
    options: [
      'Override both equals() and hashCode() so equal objects always produce the same hash code',
      'Implement Serializable and Cloneable on the key class',
      'Declare all fields public so HashMap can inspect them via reflection',
      'Override toString() to return a unique memory address',
    ],
    correctIndex: 0,
    explanation: 'HashMap locates buckets using hashCode() and resolves bucket collisions using equals(). Violating the equals/hashCode contract causes keys to become unretrievable.',
  },
  {
    id: 'q_java_2',
    skillId: 'skill_core_java',
    skillName: 'Core Java & OOP',
    difficulty: 'Intermediate',
    prompt: 'What happens to a Java Stream pipeline such as list.stream().filter(...).map(...) before a terminal operation like .toList() is invoked?',
    options: [
      'Nothing executes yet because intermediate stream operations are lazy',
      'Each element is immediately filtered and mutated in place inside the original list',
      'A background thread pool eagerly caches all intermediate results',
      'A NullPointerException is thrown if .collect() is not called on the same line',
    ],
    correctIndex: 0,
    explanation: 'Java Stream intermediate operations (filter, map, sorted) are lazy and only execute when a terminal operation (collect, toList, count, forEach) triggers traversal.',
  },
  {
    id: 'q_java_3',
    skillId: 'skill_core_java',
    skillName: 'Core Java & OOP',
    difficulty: 'Beginner',
    prompt: 'Which Java feature introduced immutable data-carrier classes with automatically generated constructors, accessors, equals(), and hashCode()?',
    options: ['record classes', 'abstract interfaces', 'volatile enums', 'transient static blocks'],
    correctIndex: 0,
    explanation: 'Java records concisely model immutable data aggregates and automatically synthesize canonical constructors, accessors, equals(), hashCode(), and toString().',
  },
  {
    id: 'q_java_4',
    skillId: 'skill_core_java',
    skillName: 'Core Java & OOP',
    difficulty: 'Advanced',
    prompt: 'Why is BigDecimal(String) or BigDecimal.valueOf(double) preferred over new BigDecimal(0.1) for financial calculations in Java?',
    options: [
      'Binary floating-point literals cannot represent 0.1 exactly, so new BigDecimal(0.1) captures binary rounding artifacts',
      'new BigDecimal(double) overflows 32-bit heap references',
      'BigDecimal(String) executes on GPU SIMD registers automatically',
      'BigDecimal.valueOf mutates primitive doubles in place',
    ],
    correctIndex: 0,
    explanation: 'IEEE 754 binary floating-point stores 0.1 as an approximation (0.10000000000000000555...), whereas String-based construction preserves exact base-10 scale.',
  },

  // Spring Boot
  {
    id: 'q_spring_1',
    skillId: 'skill_spring_boot',
    skillName: 'Spring Boot & Dependency Injection',
    difficulty: 'Intermediate',
    prompt: 'Why does Spring recommend constructor injection over @Autowired field injection?',
    options: [
      'Dependencies can be final, required collaborators are explicit, and classes can be instantiated directly in unit tests',
      'Field injection is disallowed by the Java compiler in JDK 17+',
      'Constructor injection bypasses all Spring security filters',
      'Field injection creates a separate database connection per field',
    ],
    correctIndex: 0,
    explanation: 'Constructor injection enforces immutability (final fields), prevents partially initialized beans, and lets unit tests pass mock dependencies without booting the Spring context.',
  },
  {
    id: 'q_spring_2',
    skillId: 'skill_spring_boot',
    skillName: 'Spring Boot & Dependency Injection',
    difficulty: 'Intermediate',
    prompt: 'In Spring Data JPA, what causes the N+1 select performance problem?',
    options: [
      'Fetching N parent entities in 1 query and then lazily executing N additional queries when iterating a child relationship',
      'Defining more than one @Id column on a repository interface',
      'Using @RestController instead of @Controller',
      'Running PostgreSQL with connection pooling enabled',
    ],
    correctIndex: 0,
    explanation: 'Lazy association traversal inside a loop triggers one SQL query per parent row. Using JOIN FETCH or @EntityGraph fetches the association in a single SQL query.',
  },
  {
    id: 'q_spring_3',
    skillId: 'skill_spring_boot',
    skillName: 'Spring Boot & Dependency Injection',
    difficulty: 'Advanced',
    prompt: 'Why does calling a @Transactional method from another method within the same class instance (this.saveOrder()) fail to start a new Spring transaction by default?',
    options: [
      'Self-invocation bypasses the Spring AOP proxy wrapping the bean',
      '@Transactional only works on private static methods',
      'Spring Boot disables transactions unless XML bean files are present',
      'JPA commits every SQL statement before method entry',
    ],
    correctIndex: 0,
    explanation: 'Spring manages @Transactional declaratively using proxies; internal self-invocation calls the target object directly rather than passing through the proxy interceptor.',
  },

  // SQL & Relational Databases
  {
    id: 'q_sql_1',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    difficulty: 'Beginner',
    prompt: 'What is the key difference between WHERE and HAVING in a SQL query?',
    options: [
      'WHERE filters individual rows before grouping, whereas HAVING filters aggregated groups after GROUP BY',
      'HAVING can only be used on text columns, whereas WHERE only works on numeric columns',
      'WHERE runs after ORDER BY, whereas HAVING runs before FROM',
      'They are identical aliases in ANSI SQL',
    ],
    correctIndex: 0,
    explanation: 'WHERE evaluates row-level predicates prior to aggregation; HAVING filters groups using aggregate expressions such as COUNT(*) > 5.',
  },
  {
    id: 'q_sql_2',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    difficulty: 'Intermediate',
    prompt: 'How does ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) differ from a standard GROUP BY dept_id?',
    options: [
      'Window functions compute per-partition rankings while preserving every individual employee row',
      'ROW_NUMBER() deletes duplicate salaries permanently from the table',
      'Window functions cannot be combined with ORDER BY inside OVER()',
      'GROUP BY returns more rows than ROW_NUMBER()',
    ],
    correctIndex: 0,
    explanation: 'Unlike GROUP BY, which collapses rows into one summary row per group, window functions attach analytical values to each detail row.',
  },
  {
    id: 'q_sql_3',
    skillId: 'skill_sql_databases',
    skillName: 'SQL & Relational Databases',
    difficulty: 'Advanced',
    prompt: 'Given a composite B-tree index on (customer_id, created_at), which query predicate can utilize the index most efficiently?',
    options: [
      'WHERE customer_id = 42 AND created_at >= \'2026-01-01\'',
      'WHERE EXTRACT(YEAR FROM created_at) = 2026',
      'WHERE CAST(customer_id AS TEXT) LIKE \'%42\'',
      'WHERE created_at IS NOT NULL (without customer_id)',
    ],
    correctIndex: 0,
    explanation: 'Composite B-tree indexes follow the leftmost-prefix rule: equality on the leading column (customer_id) followed by a range scan on created_at uses the index cleanly.',
  },

  // RESTful API Design
  {
    id: 'q_rest_1',
    skillId: 'skill_rest_apis',
    skillName: 'RESTful API Design',
    difficulty: 'Beginner',
    prompt: 'Which pair accurately distinguishes HTTP 401 vs HTTP 403?',
    options: [
      '401 means unauthenticated (missing/invalid credentials); 403 means authenticated but lacking permission for the resource',
      '401 means server crash; 403 means network timeout',
      '401 is for GET requests; 403 is only for DELETE requests',
      '401 indicates rate limiting; 403 indicates invalid JSON syntax',
    ],
    correctIndex: 0,
    explanation: 'HTTP 401 Unauthorized signals missing or invalid authentication credentials, while 403 Forbidden signals that the caller is known/authenticated but unauthorized.',
  },
  {
    id: 'q_rest_2',
    skillId: 'skill_rest_apis',
    skillName: 'RESTful API Design',
    difficulty: 'Intermediate',
    prompt: 'What does it mean for an HTTP method like PUT or DELETE to be idempotent?',
    options: [
      'Repeating the identical request multiple times results in the same intended resource state on the server as making it once',
      'The request never modifies server state under any circumstances',
      'The response payload is always cached forever by browsers',
      'The endpoint accepts both XML and JSON simultaneously',
    ],
    correctIndex: 0,
    explanation: 'Idempotency guarantees that network retries of the exact same PUT or DELETE request will not cause unintended duplicate side effects (unlike unguarded POST).',
  },
  {
    id: 'q_rest_3',
    skillId: 'skill_rest_apis',
    skillName: 'RESTful API Design',
    difficulty: 'Advanced',
    prompt: 'Why is cursor-based pagination preferred over large OFFSET pagination on rapidly changing tables?',
    options: [
      'OFFSET scans and discards skipped rows and can duplicate or skip items when new rows are inserted mid-scroll',
      'OFFSET is unsupported in PostgreSQL and MySQL',
      'Cursor pagination compresses JSON payloads automatically',
      'OFFSET requires GraphQL subscriptions',
    ],
    correctIndex: 0,
    explanation: 'Keyset/cursor pagination uses indexed comparison (WHERE id < last_seen_id LIMIT 25), staying O(limit) and avoiding row drift.',
  },

  // Git
  {
    id: 'q_git_1',
    skillId: 'skill_git_vcs',
    skillName: 'Git & Collaborative Version Control',
    difficulty: 'Beginner',
    prompt: 'Why should you avoid running git rebase + force-push on a shared public branch that teammates are actively basing commits on?',
    options: [
      'Rebasing rewrites commit hashes, causing divergent history and merge confusion for collaborators',
      'git rebase deletes all untracked local files across every repository',
      'GitHub blocks commits that do not contain merge commits',
      'Rebase converts binary files into plain text',
    ],
    correctIndex: 0,
    explanation: 'Rebasing creates brand-new commit SHAs. Rewriting commits already pulled by teammates forces everyone to reconcile duplicate/diverged histories.',
  },
  {
    id: 'q_git_2',
    skillId: 'skill_git_vcs',
    skillName: 'Git & Collaborative Version Control',
    difficulty: 'Intermediate',
    prompt: 'Which Git command helps recover a commit hash after an accidental local branch reset?',
    options: ['git reflog', 'git clean -fd', 'git rm --cached', 'git gc --prune=now'],
    correctIndex: 0,
    explanation: 'git reflog records recent movements of HEAD locally, allowing you to locate and restore commits that are no longer referenced by a branch tip.',
  },

  // Unit & Integration Testing
  {
    id: 'q_test_1',
    skillId: 'skill_junit_testing',
    skillName: 'Unit & Integration Testing',
    difficulty: 'Beginner',
    prompt: 'What is the primary purpose of mocking an external HTTP payment gateway inside a unit test?',
    options: [
      'To test domain logic deterministically and quickly without network flakiness or real charges',
      'To prove the external payment provider server is currently online in production',
      'To skip asserting return values in tests',
      'To replace compile-time type checking',
    ],
    correctIndex: 0,
    explanation: 'Mocks isolate the unit under test from slow, non-deterministic external services while contract/integration tests verify boundary wiring separately.',
  },
  {
    id: 'q_test_2',
    skillId: 'skill_junit_testing',
    skillName: 'Unit & Integration Testing',
    difficulty: 'Intermediate',
    prompt: 'Why can a codebase with 95% line coverage still fail in production on boundary inputs?',
    options: [
      'Line coverage only measures whether lines executed, not whether edge cases (nulls, 0, max limits) or meaningful assertions were verified',
      'Line coverage tools skip if/else statements',
      'Unit tests run slower than production code',
      'Mocks automatically pass all assertions',
    ],
    correctIndex: 0,
    explanation: 'Executing a line without asserting output invariants or testing boundary values (0, empty lists, negative numbers) leaves edge-case bugs undetected.',
  },

  // Python Core
  {
    id: 'q_py_1',
    skillId: 'skill_python_core',
    skillName: 'Python Programming',
    difficulty: 'Intermediate',
    prompt: 'What bug is caused by defining def add_tag(tag, tags=[]): tags.append(tag); return tags in Python?',
    options: [
      'Default argument objects are evaluated once at function definition time, sharing the same mutable list across calls',
      'Python raises a SyntaxError when a list literal appears in a function signature',
      'tags=[] creates an immutable tuple instead of a list',
      'The list is cleared automatically on garbage collection before return',
    ],
    correctIndex: 0,
    explanation: 'Python binds default values once when def executes. Use tags: list[str] | None = None and initialize inside the function body.',
  },
  {
    id: 'q_py_2',
    skillId: 'skill_python_core',
    skillName: 'Python Programming',
    difficulty: 'Intermediate',
    prompt: 'When processing a 4 GB CSV log file line-by-line in Python, why is a generator expression preferred over a list comprehension?',
    options: [
      'A generator yields items lazily one at a time in constant O(1) memory instead of materializing all rows in RAM',
      'Generators automatically parallelize across multiple CPU cores',
      'List comprehensions cannot filter strings',
      'Generators bypass file permissions',
    ],
    correctIndex: 0,
    explanation: 'Generators produce values on demand via the iterator protocol, preventing memory exhaustion on large streams.',
  },
  {
    id: 'q_py_3',
    skillId: 'skill_python_core',
    skillName: 'Python Programming',
    difficulty: 'Beginner',
    prompt: 'What does a with open("data.csv") as f: context manager guarantee?',
    options: [
      'The file descriptor is deterministically closed on block exit even if an exception is raised inside the block',
      'The file is encrypted on disk automatically',
      'All CSV columns are cast to float64',
      'Multiple processes cannot read the file simultaneously',
    ],
    correctIndex: 0,
    explanation: 'Context managers invoke __exit__() reliably whether the block finishes normally or raises an exception.',
  },

  // FastAPI
  {
    id: 'q_fast_1',
    skillId: 'skill_fastapi_django',
    skillName: 'FastAPI & Python Web Services',
    difficulty: 'Intermediate',
    prompt: 'What happens automatically in FastAPI when a client sends a JSON payload whose field types violate the endpoint Pydantic BaseModel?',
    options: [
      'FastAPI rejects the request before entering the handler and returns HTTP 422 with structured validation error details',
      'FastAPI silently drops invalid fields and passes None for every attribute',
      'The Python interpreter crashes with a segmentation fault',
      'FastAPI retries the request as XML',
    ],
    correctIndex: 0,
    explanation: 'Pydantic validates and coerces incoming payloads at the boundary, returning a 422 Unprocessable Entity response detailing exact field errors.',
  },
  {
    id: 'q_fast_2',
    skillId: 'skill_fastapi_django',
    skillName: 'FastAPI & Python Web Services',
    difficulty: 'Intermediate',
    prompt: 'How do you cleanly substitute a test database session in Pytest for a FastAPI route using Depends(get_db)?',
    options: [
      'Register a test replacement in app.dependency_overrides[get_db]',
      'Edit production environment variables inside the git repository',
      'Delete Depends() from all route signatures before running tests',
      'Restart PostgreSQL on port 80',
    ],
    correctIndex: 0,
    explanation: 'FastAPI provides app.dependency_overrides specifically so tests can swap database, auth, or external client dependencies cleanly.',
  },

  // Async Python
  {
    id: 'q_async_1',
    skillId: 'skill_async_python',
    skillName: 'Asynchronous & Concurrent Python',
    difficulty: 'Advanced',
    prompt: 'What happens if you call time.sleep(5) inside an async def endpoint running on a single Uvicorn event loop worker?',
    options: [
      'It blocks the entire event loop thread for 5 seconds, stalling all concurrent requests on that worker',
      'asyncio automatically converts time.sleep(5) into non-blocking await asyncio.sleep(5)',
      'Python spawns a new OS process automatically',
      'Only that single coroutine pauses while others continue normally',
    ],
    correctIndex: 0,
    explanation: 'time.sleep() is synchronous and blocks the OS thread running the event loop; use await asyncio.sleep() for non-blocking delays or asyncio.to_thread() for blocking I/O.',
  },
  {
    id: 'q_async_2',
    skillId: 'skill_async_python',
    skillName: 'Asynchronous & Concurrent Python',
    difficulty: 'Intermediate',
    prompt: 'Which asyncio utility runs multiple independent async HTTP calls concurrently and awaits all of their results?',
    options: ['await asyncio.gather(*tasks)', 'time.monotonic()', 'itertools.chain(*tasks)', 'sys.setrecursionlimit()'],
    correctIndex: 0,
    explanation: 'asyncio.gather schedules awaitables concurrently on the event loop and returns their aggregated results.',
  },

  // Docker
  {
    id: 'q_docker_1',
    skillId: 'skill_docker_containers',
    skillName: 'Docker & Containerization',
    difficulty: 'Beginner',
    prompt: 'Why should COPY requirements.txt + RUN pip install appear BEFORE COPY . . in a Dockerfile?',
    options: [
      'So edits to application source code do not invalidate the cached dependency installation layer',
      'Docker refuses to build if COPY appears only once',
      'pip install deletes source files in the working directory',
      'Docker Compose requires requirements.txt to be in the root image layer',
    ],
    correctIndex: 0,
    explanation: 'Docker caches each instruction layer sequentially; copying manifest files first preserves the expensive dependency layer across code edits.',
  },
  {
    id: 'q_docker_2',
    skillId: 'skill_docker_containers',
    skillName: 'Docker & Containerization',
    difficulty: 'Intermediate',
    prompt: 'What is the main advantage of a multi-stage Dockerfile build?',
    options: [
      'Build tools and compilers stay in the builder stage while the final runtime image contains only slim production artifacts',
      'It runs multiple databases inside a single container process',
      'It eliminates the need for container ports',
      'It automatically deploys containers to Kubernetes',
    ],
    correctIndex: 0,
    explanation: 'Multi-stage builds shrink final image size and reduce attack surface by copying only compiled/runtime artifacts into a minimal runtime image.',
  },

  // Pandas
  {
    id: 'q_pandas_1',
    skillId: 'skill_pandas_wrangling',
    skillName: 'Data Wrangling with Pandas',
    difficulty: 'Intermediate',
    prompt: 'After running merged = pd.merge(orders, customers, on="customer_id", how="left"), merged has 30% more rows than orders. What is the most likely cause?',
    options: [
      'Duplicate customer_id rows exist in the customers table, causing a one-to-many join fan-out',
      'how="left" always duplicates unmatched rows twice',
      'Pandas converts NaN values into extra rows automatically',
      'customer_id is sorted in ascending order',
    ],
    correctIndex: 0,
    explanation: 'If the right-hand lookup table contains duplicate join keys, a left join multiplies matching left-hand rows—potentially inflating downstream revenue sums.',
  },
  {
    id: 'q_pandas_2',
    skillId: 'skill_pandas_wrangling',
    skillName: 'Data Wrangling with Pandas',
    difficulty: 'Beginner',
    prompt: 'Why are vectorized Pandas operations (e.g., df["net"] = df["gross"] * 0.9) strongly preferred over iterating with df.iterrows()?',
    options: [
      'Vectorized operations execute over contiguous NumPy arrays in C rather than boxing every row as a Python Series object',
      'iterrows() is limited to 100 rows maximum',
      'Vectorized operations modify the original CSV file on disk automatically',
      'iterrows() only works on string columns',
    ],
    correctIndex: 0,
    explanation: 'Vectorized array operations avoid per-row Python interpreter overhead and Series allocation, often running 50x–100x faster.',
  },

  // Statistics
  {
    id: 'q_stats_1',
    skillId: 'skill_statistics_prob',
    skillName: 'Exploratory Statistics & Hypothesis Testing',
    difficulty: 'Intermediate',
    prompt: 'In an A/B experiment, what does a p-value of 0.03 accurately represent?',
    options: [
      'Assuming the null hypothesis (no true difference) is true, there is a 3% probability of observing a difference at least as extreme as the sample',
      'There is a 97% probability that Variant B will increase revenue by 30%',
      'Only 3% of users clicked Variant B',
      'There is a 3% chance the experiment code had a bug',
    ],
    correctIndex: 0,
    explanation: 'A p-value conditions on the null hypothesis being true; it does not measure effect magnitude or the posterior probability that the null is true.',
  },
  {
    id: 'q_stats_2',
    skillId: 'skill_statistics_prob',
    skillName: 'Exploratory Statistics & Hypothesis Testing',
    difficulty: 'Beginner',
    prompt: 'When summarizing highly right-skewed customer spend data containing a few enterprise outliers, which pair of metrics best represents typical customer behavior?',
    options: [
      'Median and Interquartile Range (IQR)',
      'Arithmetic Mean and Maximum',
      'Variance squared and Sum',
      'Mode and Row Count only',
    ],
    correctIndex: 0,
    explanation: 'Median and IQR are robust order statistics resistant to extreme right-tail outliers that pull the mean upward.',
  },

  // Data Visualization
  {
    id: 'q_viz_1',
    skillId: 'skill_data_viz_bi',
    skillName: 'Data Visualization & BI Dashboards',
    difficulty: 'Beginner',
    prompt: 'Why must a bar chart comparing revenue across regions start its quantitative axis at zero?',
    options: [
      'Viewers judge bar charts by bar length; truncating the baseline exaggerates relative differences visually',
      'Charting libraries crash when y-min is positive',
      'Zero baselines allow 12+ pie slices on the same axis',
      'Line charts and bar charts both forbid negative numbers',
    ],
    correctIndex: 0,
    explanation: 'Bar length encodes magnitude proportional to value from zero; truncating the axis distorts the visual ratio between bars.',
  },
  {
    id: 'q_viz_2',
    skillId: 'skill_data_viz_bi',
    skillName: 'Data Visualization & BI Dashboards',
    difficulty: 'Intermediate',
    prompt: 'To make a KPI status chart accessible to users with red-green color vision deficiency, what should you always do?',
    options: [
      'Pair color encodings with explicit text labels, shapes, or patterns rather than signaling status by hue alone',
      'Increase color saturation of red and green to 100%',
      'Remove all axis labels to reduce clutter',
      'Use 3D perspective bars',
    ],
    correctIndex: 0,
    explanation: 'Redundant encoding (explicit status text + distinct contrast/shape) ensures semantic state is unambiguous for all readers.',
  },

  // Spreadsheets
  {
    id: 'q_sheet_1',
    skillId: 'skill_spreadsheets',
    skillName: 'Spreadsheet Modeling & Pivot Analysis',
    difficulty: 'Beginner',
    prompt: 'Why is XLOOKUP or INDEX/MATCH safer than VLOOKUP(..., col_index_num, FALSE) in collaborative analytical workbooks?',
    options: [
      'Inserting or reordering columns inside the lookup table does not silently break hardcoded column index numbers',
      'VLOOKUP only supports exact matches on dates',
      'XLOOKUP automatically deletes duplicate rows from the source sheet',
      'Pivot tables require VLOOKUP to refresh',
    ],
    correctIndex: 0,
    explanation: 'XLOOKUP and INDEX/MATCH reference explicit lookup and return ranges directly instead of fragile positional column counts, and can look up to the left.',
  },
  {
    id: 'q_sheet_2',
    skillId: 'skill_spreadsheets',
    skillName: 'Spreadsheet Modeling & Pivot Analysis',
    difficulty: 'Intermediate',
    prompt: 'Which spreadsheet function cleanly sums order amounts that match BOTH Region = "South" AND Status = "Completed"?',
    options: ['SUMIFS', 'VLOOKUP', 'CONCATENATE', 'COUNTA'],
    correctIndex: 0,
    explanation: 'SUMIFS aggregates a numeric range across multiple simultaneous criteria ranges cleanly and auditably.',
  },
];

/**
 * Returns skill-specific practical assessment questions. If an admin creates a brand-new custom skill
 * not yet in SKILL_ASSESSMENT_BANK, generates structured conceptual diagnostic questions for that skill.
 */
export function getQuestionsForSkill(
  skillId: string,
  skillName: string,
  preferredDifficulty?: DifficultyTier
): AssessmentQuestion[] {
  const exact = SKILL_ASSESSMENT_BANK.filter((q) => q.skillId === skillId);
  if (exact.length > 0) {
    if (preferredDifficulty) {
      const filtered = exact.filter((q) => q.difficulty === preferredDifficulty);
      if (filtered.length >= 2) return filtered;
    }
    return exact;
  }

  const diff: DifficultyTier = preferredDifficulty || 'Intermediate';
  return [
    {
      id: `custom_${skillId}_1`,
      skillId,
      skillName,
      difficulty: diff,
      prompt: `When applying ${skillName} in a production engineering workflow, which practice best ensures reliability and maintainability?`,
      options: [
        `Validate inputs at module boundaries, write automated regression checks, and document clear interfaces for ${skillName}`,
        `Disable error handling so ${skillName} executes with fewer lines of code`,
        `Hardcode environment credentials directly inside ${skillName} source files`,
        `Skip version control whenever changing ${skillName} configurations`,
      ],
      correctIndex: 0,
      explanation: `Boundary validation, automated verification, and clean modular contracts are foundational engineering invariants when working with ${skillName}.`,
    },
    {
      id: `custom_${skillId}_2`,
      skillId,
      skillName,
      difficulty: diff,
      prompt: `How should performance bottlenecks or unexpected outputs in a ${skillName} implementation be diagnosed?`,
      options: [
        'Reproduce with a minimal deterministic test case, measure baseline metrics/logs, and verify one change at a time',
        'Change multiple unrelated parameters simultaneously in production without logging',
        'Assume absence of warnings guarantees correctness on edge-case inputs',
        'Delete historical logs before inspecting failure patterns',
      ],
      correctIndex: 0,
      explanation: 'Deterministic reproduction and measured hypothesis testing prevent regressions and confirm root causes.',
    },
  ];
}

export const SAMPLE_STUDENT_RESUME_TEXT = `Aarav Krishnan
B.Tech Computer Science & Engineering (Class of 2026) — Francis Xavier Engineering College
GitHub: github.com/aarav-dev

EDUCATION
Bachelor of Technology in Computer Science & Engineering (2022 - 2026), CGPA: 8.6/10

TECHNICAL SKILLS
Languages: Java, Python, SQL
Web & Tools: REST APIs, Git, GitHub, MySQL, Pandas (basic coursework)

ACADEMIC PROJECTS
1. Campus Library Inventory Service — Built a Java + MySQL CRUD service with REST endpoints for tracking book checkouts and overdue fines.
2. Student Attendance Exploratory Notebook — Cleaned semester attendance CSV files using Python and Pandas to summarize department trends.

CERTIFICATIONS
- NPTEL Programming in Java (Elite Certificate, 2025)
- HackerRank SQL (Intermediate) Skill Certificate

EXPERIENCE
Software Engineering Student Intern, Campus Digital Lab (Summer 2025, 2 months)
Collaborated using Git pull requests to maintain internal REST endpoints and write SQL reporting queries.`;
