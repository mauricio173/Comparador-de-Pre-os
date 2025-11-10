import { GoogleGenAI } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('product-search') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;
    const resultsContainer = document.getElementById('results-container');
    const recentTagsContainer = document.getElementById('recent-tags');
    const sourcesContainer = document.getElementById('sources-container');
    const comparisonSection = document.getElementById('comparison-section');
    const savedItemsSection = document.getElementById('saved-items-section');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let recentSearches = JSON.parse(localStorage.getItem('hyperscanRecentSearches')) || ["Smartphone", "Bluetooth Headphones", "Smartwatch"];
    let comparisonList = JSON.parse(localStorage.getItem('hyperscanComparisonList')) || [];
    let savedList = JSON.parse(localStorage.getItem('hyperscanSavedList')) || [];

    const isProductInList = (product, list) => list.some(item => item.link === product.link);

    const handleAddToCompare = (product) => {
        if (!isProductInList(product, comparisonList)) {
            comparisonList.push(product);
            localStorage.setItem('hyperscanComparisonList', JSON.stringify(comparisonList));
            renderComparisonList();
        }
    };
    
    const handleAddToSaved = (product) => {
        if (!isProductInList(product, savedList)) {
            savedList.push(product);
            localStorage.setItem('hyperscanSavedList', JSON.stringify(savedList));
            renderSavedList();
        }
    };

    const handleRemoveFromCompare = (productLink) => {
        comparisonList = comparisonList.filter(p => p.link !== productLink);
        localStorage.setItem('hyperscanComparisonList', JSON.stringify(comparisonList));
        renderComparisonList();
    };

    const handleRemoveFromSaved = (productLink) => {
        savedList = savedList.filter(p => p.link !== productLink);
        localStorage.setItem('hyperscanSavedList', JSON.stringify(savedList));
        renderSavedList();
    };

    const updateRecentTags = () => {
        if (!recentTagsContainer) return;
        recentTagsContainer.innerHTML = '';
        recentSearches.forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('tag');
            tagSpan.textContent = tagText;
            tagSpan.addEventListener('click', () => {
                searchInput.value = tagText;
                performSearch();
            });
            recentTagsContainer.appendChild(tagSpan);
        });
    };

    const addRecentSearch = (query) => {
        if (!query) return;
        query = query.trim();
        const displayQuery = query.charAt(0).toUpperCase() + query.slice(1);
        if (query && !recentSearches.map(s => s.toLowerCase()).includes(query.toLowerCase())) {
            recentSearches.unshift(displayQuery);
            if (recentSearches.length > 5) {
                recentSearches.pop();
            }
            localStorage.setItem('hyperscanRecentSearches', JSON.stringify(recentSearches));
            updateRecentTags();
        }
    };

    const createProductCard = (product, context = 'search') => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/200x200/1A0D3A/00FFFF?text=No+Image'}" alt="${product.name}" class="product-image">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-store">Loja: ${product.store}</p>
            <p class="product-price">${product.price}</p>
        `;
    
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'product-actions';
        
        const offerLink = document.createElement('a');
        offerLink.href = product.link;
        offerLink.target = '_blank';
        offerLink.rel = 'noopener noreferrer';
        offerLink.className = 'product-link';
        offerLink.textContent = 'Ver Oferta';
        actionsContainer.appendChild(offerLink);
    
        const secondaryActionsContainer = document.createElement('div');
        secondaryActionsContainer.className = 'secondary-actions';
        
        if (context === 'search') {
            const inCompare = isProductInList(product, comparisonList);
            const compareBtn = document.createElement('button');
            compareBtn.className = 'action-btn compare-btn';
            compareBtn.textContent = inCompare ? 'Comparando' : 'Comparar';
            compareBtn.disabled = inCompare;
            if (!inCompare) {
                compareBtn.addEventListener('click', () => {
                    handleAddToCompare(product);
                    compareBtn.textContent = 'Comparando';
                    compareBtn.disabled = true;
                });
            }
    
            const inSaved = isProductInList(product, savedList);
            const saveBtn = document.createElement('button');
            saveBtn.className = 'action-btn save-btn';
            saveBtn.textContent = inSaved ? 'Salvo' : 'Salvar';
            saveBtn.disabled = inSaved;
            if (!inSaved) {
                saveBtn.addEventListener('click', () => {
                    handleAddToSaved(product);
                    saveBtn.textContent = 'Salvo';
                    saveBtn.disabled = true;
                });
            }
            secondaryActionsContainer.appendChild(compareBtn);
            secondaryActionsContainer.appendChild(saveBtn);
        } else {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn';
            removeBtn.textContent = 'Remover';
            if (context === 'compare') {
                removeBtn.addEventListener('click', () => handleRemoveFromCompare(product.link));
            } else if (context === 'saved') {
                removeBtn.addEventListener('click', () => handleRemoveFromSaved(product.link));
            }
            secondaryActionsContainer.style.justifyContent = 'center';
            secondaryActionsContainer.appendChild(removeBtn);
        }
    
        actionsContainer.appendChild(secondaryActionsContainer);
        card.appendChild(actionsContainer);
    
        return card;
    };
    
    const displayMessage = (message, isError = false) => {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = `
            <div class="result-message" style="${isError ? 'color: #ff6b6b;' : ''}">
                <p>${message}</p>
            </div>
        `;
    };

    const displayResults = (products) => {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = ''; 
        if (!products || products.length === 0) {
            displayMessage("Nenhum resultado encontrado. Tente refinar sua busca.");
        } else {
            products.forEach(product => {
                resultsContainer.appendChild(createProductCard(product, 'search'));
            });
        }
    };

    // FIX: Add explicit types for chunks and webSources to fix 'property does not exist on type unknown' errors.
    const displaySources = (chunks: any[] | undefined) => {
        if (!sourcesContainer) return;
        sourcesContainer.innerHTML = '';
        const webSources: { uri: string; title: string }[] = chunks?.filter(c => c.web).map(c => c.web) || [];
        
        if (webSources.length > 0) {
            const uniqueSources = [...new Map(webSources.map(item => [item.uri, item])).values()];

            sourcesContainer.innerHTML = '<h4>Fontes de Informação:</h4>';
            const list = document.createElement('ul');
            list.classList.add('sources-list');
            uniqueSources.forEach(source => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<a href="${source.uri}" target="_blank" rel="noopener noreferrer">${source.title || new URL(source.uri).hostname}</a>`;
                list.appendChild(listItem);
            });
            sourcesContainer.appendChild(list);
        }
    };

    const renderComparisonList = () => {
        if (!comparisonSection) return;
        comparisonSection.innerHTML = '';
        if (comparisonList.length > 0) {
            comparisonSection.innerHTML = `<h2 class="section-title">Itens para Comparar</h2>`;
            const container = document.createElement('div');
            container.className = 'extra-items-container';
            comparisonList.forEach(product => {
                container.appendChild(createProductCard(product, 'compare'));
            });
            comparisonSection.appendChild(container);
        }
    };

    const renderSavedList = () => {
        if (!savedItemsSection) return;
        savedItemsSection.innerHTML = '';
        if (savedList.length > 0) {
            savedItemsSection.innerHTML = `<h2 class="section-title">Itens Salvos</h2>`;
            const container = document.createElement('div');
            container.className = 'extra-items-container';
            savedList.forEach(product => {
                container.appendChild(createProductCard(product, 'saved'));
            });
            savedItemsSection.appendChild(container);
        }
    };

    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;
        
        addRecentSearch(query);

        searchButton.disabled = true;
        searchButton.textContent = 'Pesquisando...';
        if (sourcesContainer) sourcesContainer.innerHTML = '';
        displayMessage("Analisando a galáxia de ofertas para você...");

        try {
            const prompt = `Você é um assistente de compras online focado em encontrar as melhores ofertas. O usuário quer comprar: "${query}". Sua tarefa é pesquisar na web e encontrar até 8 das melhores ofertas para este produto em lojas online. Apresente os resultados em um array JSON. Cada item no array deve ser um objeto representando uma oferta e deve conter as seguintes chaves, e nada mais: 'name' (nome completo do produto), 'store' (nome da loja), 'price' (preço formatado como string, ex: "R$ 1.999,00"), 'link' (URL direto para a página do produto), e 'image' (URL direto para a imagem do produto). Garanta que os links e URLs de imagem sejam válidos e diretos. Forneça apenas o array JSON na sua resposta.`;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const text = response.text;
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("Não foi possível encontrar um JSON válido na resposta.");
            }
            
            const products = JSON.parse(jsonMatch[0]);
            displayResults(products);
            displaySources(groundingChunks);

        } catch (error) {
            console.error("Erro na busca:", error);
            displayMessage("Ocorreu um erro ao buscar as ofertas. Por favor, tente novamente.", true);
        } finally {
            searchButton.disabled = false;
            searchButton.innerHTML = '<span class="icon-scan"></span> Pesquisar';
        }
    };

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    updateRecentTags();
    renderComparisonList();
    renderSavedList();
});





















document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('product-search');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');
    const recentTagsContainer = document.getElementById('recent-tags');

    // Funções simuladas para a demonstração
    const mockProducts = [
        {
            id: 1,
            name: "Smartphone HyperX 2000",
            store: "TechGalore",
            price: "R$ 2.899,00",
            image: "https://via.placeholder.com/200x200/6A0DAD/00FFFF?text=Smartphone",
            link: "#"
        },
        {
            id: 2,
            name: "Fone Bluetooth SonicWave",
            store: "SoundBlast",
            price: "R$ 499,99",
            image: "https://via.placeholder.com/200x200/00FFFF/6A0DAD?text=Fone+BT",
            link: "#"
        },
        {
            id: 3,
            name: "Smartwatch NeoPulse",
            store: "WearableFuture",
            price: "R$ 1.250,00",
            image: "https://via.placeholder.com/200x200/6A0DAD/E0E0E0?text=Smartwatch",
            link: "#"
        },
        {
            id: 4,
            name: "Câmera Mirrorless ProVision",
            store: "PhotoVerse",
            price: "R$ 6.199,00",
            image: "https://via.placeholder.com/200x200/0B011F/00FFFF?text=Camera",
            link: "#"
        },
        {
            id: 5,
            name: "Monitor Ultrawide Gamer",
            store: "PixelPerfection",
            price: "R$ 3.500,00",
            image: "https://via.placeholder.com/200x200/1D054F/E0E0E0?text=Monitor",
            link: "#"
        },
        {
            id: 6,
            name: "Teclado Mecânico RGB",
            store: "GameGear",
            price: "R$ 789,90",
            image: "https://via.placeholder.com/200x200/4A008F/E0E0E0?text=Teclado",
            link: "#"
        },
        // Mais produtos para simular busca
        {
            id: 7,
            name: "Smartphone UltraMax",
            store: "EletronicsNow",
            price: "R$ 3.199,00",
            image: "https://via.placeholder.com/200x200/6A0DAD/00FFFF?text=Smartphone+Ultramax",
            link: "#"
        },
        {
            id: 8,
            name: "Fone de Ouvido Sem Fio Lux",
            store: "AudioParadise",
            price: "R$ 550,00",
            image: "https://via.placeholder.com/200x200/00FFFF/6A0DAD?text=Fone+Lux",
            link: "#"
        }
    ];

    let recentSearches = JSON.parse(localStorage.getItem('hyperscanRecentSearches')) || ["Smartphone X", "Fone Bluetooth Y", "Smartwatch Z"];

    const updateRecentTags = () => {
        recentTagsContainer.innerHTML = '';
        recentSearches.forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('tag');
            tagSpan.textContent = tagText;
            tagSpan.addEventListener('click', () => {
                searchInput.value = tagText;
                performSearch();
            });
            recentTagsContainer.appendChild(tagSpan);
        });
    };

    const addRecentSearch = (query) => {
        if (!query) return;
        query = query.trim();
        if (query && !recentSearches.includes(query)) {
            recentSearches.unshift(query); // Adiciona no início
            if (recentSearches.length > 5) { // Limita a 5 buscas recentes
                recentSearches.pop();
            }
            localStorage.setItem('hyperscanRecentSearches', JSON.stringify(recentSearches));
            updateRecentTags();
        }
    };

    const createProductCard = (product) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-store">Loja: ${product.store}</p>
            <p class="product-price">${product.price}</p>
            <a href="${product.link}" target="_blank" class="product-link">Ver Oferta</a>
        `;
        return card;
    };

    const displayResults = (products) => {
        resultsContainer.innerHTML = ''; // Limpa resultados anteriores
        if (products.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>Nenhum resultado encontrado para sua busca.</p>
                    <p>Tente refinar sua pesquisa ou explore outras opções.</p>
                </div>
            `;
        } else {
            products.forEach(product => {
                resultsContainer.appendChild(createProductCard(product));
            });
        }
    };

    const performSearch = () => {
        const query = searchInput.value.toLowerCase();
        addRecentSearch(query); // Adiciona a busca à lista de recentes

        // Simula uma busca filtrando os mockProducts
        const filteredProducts = mockProducts.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.store.toLowerCase().includes(query)
        );
        displayResults(filteredProducts);
    };

    // Event Listeners
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Inicializa as tags recentes e exibe o estado inicial dos resultados
    updateRecentTags();
    displayResults([]); // Começa sem resultados, aguardando a primeira busca
});




