// GitHub username
const GITHUB_USERNAME = 'BotCoder254';
const BACKEND_URL = 'https://portfolio-backend-8q07.onrender.com';

// Current page for projects pagination
let currentPage = 1;
const projectsPerPage = 6;
let currentFilter = 'all';
let currentSort = 'stars';
let totalStarsCount = 0;
let totalForksCount = 0;
let languagesUsed = new Set();
let allRepositories = [];

// Cache for project counts
const projectCounts = {
    all: 0,
    web: 0,
    api: 0
};

// Typewriter effect
function typeWriter(text, element, speed = 100) {
    let i = 0;
    element.textContent = '';
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Fetch GitHub user data with retry mechanism
async function fetchGitHubUser(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/github/user`);
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
            }
            
            const userData = await response.json();
            
            // Update bio content
            const bioElement = getElement('bio-content');
            if (bioElement) {
                bioElement.innerHTML = `
                    <div class="space-y-4">
                        <p class="text-lg">${userData.bio || 'Full Stack JavaScript Developer passionate about creating innovative web solutions.'}</p>
                        <div class="stats stats-vertical shadow">
                            <div class="stat">
                                <div class="stat-figure text-primary">
                                    <i class="fas fa-map-marker-alt text-2xl"></i>
                                </div>
                                <div class="stat-title">Location</div>
                                <div class="stat-value text-sm">${userData.location || 'Kenya'}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-figure text-secondary">
                                    <i class="fas fa-users text-2xl"></i>
                                </div>
                                <div class="stat-title">Followers</div>
                                <div class="stat-value text-sm">${userData.followers}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-figure text-accent">
                                    <i class="fas fa-code-branch text-2xl"></i>
                                </div>
                                <div class="stat-title">Repositories</div>
                                <div class="stat-value text-sm">${userData.public_repos}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Update stats
            updateElementText('projects-count', userData.public_repos || 0);
            updateElementText('projects-desc', `Last updated ${new Date(userData.updated_at).toLocaleDateString()}`);
            updateElementText('followers-count', userData.followers || 0);
            updateElementText('followers-desc', 'GitHub Followers');
            
            return userData;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) {
                showToast(`Error fetching user data: ${error.message}`, 'error');
                return null;
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Fetch GitHub repositories
async function fetchGitHubRepos(page = 1, filter = 'all') {
    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=${projectsPerPage}&page=${page}`);
        const repos = await response.json();
        
        const projectsGrid = document.getElementById('projects-grid');
        if (page === 1) {
            projectsGrid.innerHTML = ''; // Clear existing content only on first page
        }
        
        let totalStars = 0;
        let filteredRepos = repos;
        
        if (filter === 'web') {
            filteredRepos = repos.filter(repo => repo.topics?.includes('web') || repo.language === 'JavaScript' || repo.language === 'TypeScript');
        } else if (filter === 'api') {
            filteredRepos = repos.filter(repo => repo.topics?.includes('api') || repo.name.toLowerCase().includes('api'));
        }
        
        filteredRepos.forEach(repo => {
            totalStars += repo.stargazers_count;
            const card = createProjectCard(repo);
            projectsGrid.appendChild(card);
        });

        // Update total stars count with animation
        animateValue('stars-count', 0, totalStars, 1000);
        document.getElementById('stars-desc').textContent = `Across all repositories`;
        
        // Hide load more button if no more repos
        const loadMoreBtn = document.querySelector('button[onclick="loadMoreProjects()"]');
        if (repos.length < projectsPerPage) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-flex';
        }
        
        return repos;
    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        showToast('Error fetching repositories', 'error');
    }
}

// Filter projects
function filterProjects(filter) {
    currentFilter = filter;
    currentPage = 1;
    fetchGitHubRepos(currentPage, filter);
    
    // Update active button
    document.querySelectorAll('.join-item').forEach(btn => {
        btn.classList.remove('btn-active');
        if (btn.textContent.toLowerCase().includes(filter)) {
            btn.classList.add('btn-active');
        }
    });
}

// Load more projects
function loadMoreProjects() {
    currentPage++;
    fetchGitHubRepos(currentPage, currentFilter);
}

// Fetch all GitHub stats
async function fetchGitHubStats() {
    try {
        // Fetch user data
        const userData = await fetchGitHubUser();
        
        // Fetch all repositories
        const allRepos = await fetchAllRepositories();
        
        // Calculate total stats
        totalStarsCount = allRepos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
        totalForksCount = allRepos.reduce((acc, repo) => acc + repo.forks_count, 0);
        
        // Update stats display
        document.getElementById('total-stars').textContent = totalStarsCount;
        document.getElementById('total-forks').textContent = totalForksCount;
        
        // Fetch and count languages
        const languages = new Set();
        for (const repo of allRepos) {
            if (repo.language) {
                languages.add(repo.language);
            }
        }
        document.getElementById('total-languages').textContent = languages.size;
        languagesUsed = languages;
        
        // Update featured projects count
        document.getElementById('featured-projects-count').textContent = Math.min(allRepos.length, 6);
        
        return { userData, allRepos };
    } catch (error) {
        console.error('Error fetching GitHub stats:', error);
        showToast('Error fetching GitHub statistics', 'error');
    }
}

// Fetch all repositories with pagination and retry
async function fetchAllRepositories(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/github/repos`);
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
            }
            
            const allRepos = await response.json();
            
            if (allRepos.length === 0) {
                throw new Error('No repositories found');
            }
            
            return allRepos;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) {
                showToast(`Error fetching repositories: ${error.message}`, 'error');
                return [];
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Create project card element
function createProjectCard(repo) {
    const card = document.createElement('div');
    card.className = 'card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2';
    
    const languages = repo.language ? `<div class="badge badge-primary">${repo.language}</div>` : '';
    const topics = repo.topics?.map(topic => `<div class="badge badge-outline">${topic}</div>`).join('') || '';
    
    // Get the appropriate icon for the language
    const languageIcon = getLanguageIcon(repo.language);
    
    card.innerHTML = `
        <figure class="px-4 pt-4">
            <div class="w-full h-48 bg-base-200 rounded-xl flex items-center justify-center relative group">
                ${languageIcon}
                <div class="absolute inset-0 bg-base-300 opacity-0 group-hover:opacity-75 transition-opacity flex items-center justify-center">
                    <a href="${repo.html_url}" target="_blank" class="btn btn-primary btn-sm opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all">
                        <i class="fas fa-code-branch mr-2"></i>View Repository
                    </a>
                </div>
            </div>
        </figure>
        <div class="card-body">
            <h2 class="card-title">
                ${repo.name}
                ${repo.fork ? '<div class="badge badge-secondary">Fork</div>' : ''}
                ${repo.stargazers_count > 0 ? `<div class="badge badge-accent"><i class="fas fa-star mr-1"></i>${repo.stargazers_count}</div>` : ''}
            </h2>
            <p>${repo.description || 'No description available'}</p>
            <div class="flex flex-wrap gap-2 mt-2">
                ${languages}
                ${topics}
            </div>
            <div class="card-actions justify-between items-center mt-4">
                <div class="flex gap-2">
                    <div class="badge badge-ghost tooltip" data-tip="Stars">
                        <i class="fas fa-star mr-1"></i>${repo.stargazers_count}
                    </div>
                    <div class="badge badge-ghost tooltip" data-tip="Forks">
                        <i class="fas fa-code-fork mr-1"></i>${repo.forks_count}
                    </div>
                    <div class="badge badge-ghost tooltip" data-tip="Last Updated">
                        <i class="fas fa-clock mr-1"></i>${new Date(repo.updated_at).toLocaleDateString()}
                    </div>
                </div>
                <div class="join">
                    <a href="${repo.html_url}" target="_blank" class="btn join-item btn-primary btn-sm">
                        <i class="fab fa-github"></i>
                    </a>
                    ${repo.homepage ? `
                        <a href="${repo.homepage}" target="_blank" class="btn join-item btn-primary btn-sm">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Get language icon
function getLanguageIcon(language) {
    if (!language) return '<i class="fas fa-code text-6xl text-primary opacity-30"></i>';
    
    const languageMap = {
        'JavaScript': 'devicon-javascript-plain colored',
        'TypeScript': 'devicon-typescript-plain colored',
        'Python': 'devicon-python-plain colored',
        'HTML': 'devicon-html5-plain colored',
        'CSS': 'devicon-css3-plain colored',
        'Ruby': 'devicon-ruby-plain colored',
        'PHP': 'devicon-php-plain colored',
        'Java': 'devicon-java-plain colored',
        'C#': 'devicon-csharp-plain colored',
        'C++': 'devicon-cplusplus-plain colored',
        'Go': 'devicon-go-plain colored',
        'Rust': 'devicon-rust-plain colored',
    };
    
    const iconClass = languageMap[language] || 'fas fa-code text-primary opacity-30';
    return `<i class="${iconClass} text-6xl"></i>`;
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-end';
    toast.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Animate number value
function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element with id ${elementId} not found`);
        return;
    }
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const animate = () => {
        current += increment;
        element.textContent = Math.floor(current);
        
        if (current < end) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = end;
        }
    };
    
    animate();
}

// Utility function to safely get DOM elements
const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
};

// Utility function to safely update element text
const updateElementText = (elementId, text) => {
    const element = getElement(elementId);
    if (element) {
        element.textContent = text;
    }
};

// Theme toggle functionality
function toggleTheme() {
    const html = document.querySelector('html');
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    
    // Save theme preference
    localStorage.setItem('theme', newTheme);
}

// Scroll to section with smooth animation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Update scroll progress and back to top button visibility
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    // Update progress bar
    document.getElementById('scroll-progress').style.width = scrolled + '%';
    
    // Show/hide back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (winScroll > 300) {
        backToTopBtn.classList.remove('opacity-0');
    } else {
        backToTopBtn.classList.add('opacity-0');
    }
});

// Sort repositories
function sortRepositories(repos, sortBy = 'stars') {
    switch (sortBy) {
        case 'stars':
            return repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
        case 'recent':
            return repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        case 'forks':
            return repos.sort((a, b) => b.forks_count - a.forks_count);
        default:
            return repos;
    }
}

// Filter repositories
function filterRepositories(repos, filter = 'all') {
    switch (filter) {
        case 'web':
            return repos.filter(repo => 
                repo.topics?.includes('web') || 
                repo.topics?.includes('website') ||
                repo.language === 'JavaScript' || 
                repo.language === 'TypeScript' ||
                repo.language === 'HTML' ||
                repo.name.toLowerCase().includes('web') ||
                repo.name.toLowerCase().includes('app')
            );
        case 'api':
            return repos.filter(repo => 
                repo.topics?.includes('api') || 
                repo.name.toLowerCase().includes('api') ||
                repo.name.toLowerCase().includes('service') ||
                repo.description?.toLowerCase().includes('api')
            );
        default:
            return repos;
    }
}

// Update project counts safely
function updateProjectCounts(repos) {
    projectCounts.all = repos.length;
    projectCounts.web = filterRepositories(repos, 'web').length;
    projectCounts.api = filterRepositories(repos, 'api').length;
    
    updateElementText('all-projects-count', projectCounts.all);
    updateElementText('web-projects-count', projectCounts.web);
    updateElementText('api-projects-count', projectCounts.api);
}

// Sort projects
function sortProjects(sortBy) {
    currentSort = sortBy;
    currentPage = 1;
    
    // Update active tab
    document.querySelectorAll('.tabs-boxed .tab').forEach(tab => {
        tab.classList.remove('tab-active');
        if (tab.textContent.toLowerCase().includes(sortBy)) {
            tab.classList.add('tab-active');
        }
    });
    
    // Re-render projects
    const filteredRepos = filterRepositories(allRepositories, currentFilter);
    const sortedRepos = sortRepositories(filteredRepos, sortBy);
    displayProjects(sortedRepos, true);
}

// Display projects
function displayProjects(repos, clearGrid = true) {
    const projectsGrid = getElement('projects-grid');
    if (!projectsGrid) return;

    if (clearGrid) {
        projectsGrid.innerHTML = '';
    }

    const start = (currentPage - 1) * projectsPerPage;
    const end = start + projectsPerPage;
    const pageRepos = repos.slice(start, end);
    
    pageRepos.forEach(repo => {
        const card = createProjectCard(repo);
        projectsGrid.appendChild(card);
    });
    
    // Update load more button visibility
    const loadMoreBtn = getElement('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = end >= repos.length ? 'none' : 'inline-flex';
    }
    
    // Update featured stats safely
    updateElementText('featured-projects-count', Math.min(repos.length, projectsPerPage * currentPage));
    updateElementText('featured-stars-count', repos.reduce((acc, repo) => acc + repo.stargazers_count, 0));
    updateElementText('total-stars', repos.reduce((acc, repo) => acc + repo.stargazers_count, 0));
    updateElementText('featured-languages-count', new Set(repos.map(repo => repo.language).filter(Boolean)).size);
}

// Initialize with better error handling
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Set default theme to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.querySelector('html').setAttribute('data-theme', savedTheme);
        document.querySelectorAll('.swap input').forEach(input => {
            input.checked = savedTheme === 'dark';
        });

        // Show loading states
        const loadingElements = ['projects-grid', 'bio-content', 'calendar'];
        loadingElements.forEach(id => {
            const element = getElement(id);
            if (element) {
                element.innerHTML = '<div class="loading loading-spinner loading-lg"></div>';
            }
        });

        // Initialize typewriter effect
        const typewriterElement = document.querySelector('.typewriter');
        if (typewriterElement) {
            typeWriter('Full Stack JavaScript Developer', typewriterElement);
        }

        // Handle contact form submission
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Show loading state
                const submitBtn = contactForm.querySelector('.btn-primary');
                if (!submitBtn) {
                    console.error('Submit button not found');
                    return;
                }
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="loading loading-spinner"></span> Sending...';
                submitBtn.disabled = true;
                
                try {
                    const formData = new FormData(e.target);
                    const data = {
                        name: formData.get('name'),
                        email: formData.get('email'),
                        subject: formData.get('subject'),
                        message: formData.get('message')
                    };

                    // Validate form data
                    if (!data.name || !data.email || !data.message) {
                        throw new Error('Please fill in all required fields');
                    }
                    
                    const response = await fetch(`${BACKEND_URL}/api/contact`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to send message');
                    }
                    
                    showToast('Message sent successfully!', 'success');
                    e.target.reset();
                } catch (error) {
                    console.error('Error sending message:', error);
                    showToast(error.message || 'Failed to send message. Please try again.', 'error');
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }

        // Fetch GitHub data with retries
        const [userData, allRepos] = await Promise.all([
            fetchGitHubUser(),
            fetchAllRepositories()
        ]);

        if (!userData && !allRepos.length) {
            throw new Error('Failed to fetch GitHub data');
        }

        // Update UI with fetched data
        if (allRepos.length > 0) {
            allRepositories = allRepos;
            totalStarsCount = allRepos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
            totalForksCount = allRepos.reduce((acc, repo) => acc + repo.forks_count, 0);
            languagesUsed = new Set(allRepos.map(repo => repo.language).filter(Boolean));

            // Update all stats
            updateElementText('total-stars', totalStarsCount);
            updateElementText('total-forks', totalForksCount);
            updateElementText('total-languages', languagesUsed.size);
            updateElementText('featured-stars-count', totalStarsCount);
            updateElementText('featured-languages-count', languagesUsed.size);
            updateElementText('nav-total-stars', totalStarsCount);

            // Update project counts and display projects
            updateProjectCounts(allRepositories);
            const sortedRepos = sortRepositories(allRepos, 'stars');
            displayProjects(sortedRepos, true);
        }

        // Initialize GitHub calendar
        try {
            const calendar = await GitHubCalendar(".calendar", GITHUB_USERNAME, {
                responsive: true,
                tooltips: true,
                global_stats: true,
                cache: 24 * 60 * 60 * 1000
            });
            
            if (calendar) {
                const totalContributions = calendar.getTotalContributions();
                updateElementText('total-contributions', totalContributions);
            }
        } catch (calendarError) {
            console.error('Error initializing GitHub calendar:', calendarError);
            const calendarElement = getElement('calendar');
            if (calendarElement) {
                calendarElement.innerHTML = '<div class="alert alert-warning">Failed to load contribution calendar</div>';
            }
        }

    } catch (error) {
        console.error('Error initializing:', error);
        handleInitializationError(error);
    }
});

// Helper function to handle initialization errors
function handleInitializationError(error) {
    const errorElements = {
        'projects-grid': 'Error loading projects',
        'bio-content': 'Error loading profile information',
        'calendar': 'Error loading contribution calendar'
    };

    Object.entries(errorElements).forEach(([id, message]) => {
        const element = getElement(id);
        if (element) {
            element.innerHTML = `
                <div class="alert alert-error shadow-lg">
                    <div>
                        <i class="fas fa-exclamation-circle"></i>
                        <span>${message}. Please try again later.</span>
                    </div>
                </div>
            `;
        }
    });

    showToast('Error loading GitHub data. Please check your connection and try again.', 'error');
} 