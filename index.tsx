import { GoogleGenAI } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('product-search') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;
    const resultsContainer = document.getElementById('results-container');
    const recentTagsContainer = document.getElementById('recent-tags');
    const sourcesContainer = document.getElementById('sources-container');
    const comparisonSection = document.getElementById('comparison-section');
    const savedItemsSection = document.getElementById('saved-items-section');
    const filtersContainer = document.getElementById('search-filters');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let recentSearches = JSON.parse(localStorage.getItem('hyperscanRecentSearches')) || ["Smartphone", "Bluetooth Headphones", "Smartwatch"];
    let comparisonList = JSON.parse(localStorage.getItem('hyperscanComparisonList')) || [];
    let savedList = JSON.parse(localStorage.getItem('hyperscanSavedList')) || [];
    let timerInterval: number | undefined;
    let counterInterval: number | undefined;

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

    const handleRemoveRecentSearch = (tagToRemove: string) => {
        recentSearches = recentSearches.filter(tag => tag !== tagToRemove);
        localStorage.setItem('hyperscanRecentSearches', JSON.stringify(recentSearches));
        updateRecentTags();
    };

    const updateRecentTags = () => {
        if (!recentTagsContainer) return;
        recentTagsContainer.innerHTML = '';
        recentSearches.forEach(tagText => {
            const tagContainer = document.createElement('div');
            tagContainer.className = 'tag-container';
            
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag-text';
            tagSpan.textContent = tagText;
            tagSpan.addEventListener('click', () => {
                searchInput.value = tagText;
                performSearch();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-tag-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.setAttribute('aria-label', `Remover ${tagText}`);
            deleteBtn.title = `Remover "${tagText}"`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent tag click event from firing
                handleRemoveRecentSearch(tagText);
            });

            tagContainer.appendChild(tagSpan);
            tagContainer.appendChild(deleteBtn);
            recentTagsContainer.appendChild(tagContainer);
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
    
        const img = document.createElement('img');
        img.className = 'product-image';
        img.alt = product.name;
        // Set a temporary loading image and an error handler
        img.src = product.image || 'https://via.placeholder.com/200x200/1A0D3A/00FFFF?text=Loading...';
        img.onerror = () => {
            img.src = 'https://via.placeholder.com/200x200/1A0D3A/00FFFF?text=No+Image';
        };
    
        const title = document.createElement('h3');
        title.className = 'product-title';
        title.textContent = product.name;
    
        const store = document.createElement('p');
        store.className = 'product-store';
        store.textContent = `Loja: ${product.store}`;
    
        const price = document.createElement('p');
        price.className = 'product-price';
        price.textContent = product.price;
    
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(store);
        card.appendChild(price);
    
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
            displayMessage("Nenhuma oferta encontrada. Tente refinar sua busca ou selecionar outras fontes.");
        } else {
            products.forEach(product => {
                resultsContainer.appendChild(createProductCard(product, 'search'));
            });
        }
    };

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
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loader"></div>
                    <p>Analisando a galáxia de ofertas para você...</p>
                    <div class="loading-stats">
                        <p>Tempo: <span id="timer">0s</span></p>
                        <p>Itens verificados: <span id="item-counter">0</span></p>
                    </div>
                </div>
            `;
        }

        let seconds = 0;
        let itemsChecked = 0;
        const timerEl = document.getElementById('timer');
        const counterEl = document.getElementById('item-counter');

        clearInterval(timerInterval);
        clearInterval(counterInterval);

        timerInterval = window.setInterval(() => {
            seconds++;
            if (timerEl) timerEl.textContent = `${seconds}s`;
        }, 1000);

        counterInterval = window.setInterval(() => {
            itemsChecked += Math.floor(Math.random() * 500) + 100;
            if (counterEl) counterEl.textContent = itemsChecked.toLocaleString('pt-BR');
        }, 300);

        try {
            const selectedSources = Array.from(filtersContainer?.querySelectorAll('input[type="checkbox"]:checked') || [])
                                         .map(cb => (cb as HTMLInputElement).value);
            
            let sourcesInstruction = "Sua tarefa é pesquisar na web e encontrar até 8 das melhores ofertas para este produto em lojas online.";
            if (selectedSources.length > 0) {
                sourcesInstruction = `Sua tarefa é pesquisar exclusivamente em: ${selectedSources.join(', ')} e encontrar até 8 das melhores ofertas para este produto.`;
            }

            const prompt = `Você é um assistente de compras online de alta precisão, focado em encontrar as melhores e mais relevantes ofertas. O usuário quer comprar: "${query}".
            ${sourcesInstruction}
            É crucial que os resultados correspondam *exatamente* ao produto "${query}". Ignore completamente produtos similares, acessórios, ou itens de cores/capacidades diferentes, a menos que especificado.
            Verifique rigorosamente se cada 'link' está ativo, funcional e leva diretamente à página de compra do produto correto, não a uma página de busca geral ou a um item esgotado. A precisão do link é a maior prioridade.
            Apresente os resultados em um array JSON. Cada item no array deve ser um objeto representando uma oferta e deve conter as seguintes chaves, e nada mais: 'name' (nome completo do produto, que deve ser muito similar à busca), 'store' (nome da loja), 'price' (preço formatado como string, ex: "R$ 1.999,00"), 'link' (URL direto e válido para a página do produto), e 'image' (URL direto e válido para a imagem do produto).
            Forneça apenas o array JSON na sua resposta. Se não encontrar nenhuma oferta relevante e válida, retorne um array JSON vazio [].`;
            
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
                // If no JSON is found, it could be because the model found nothing and returned text.
                // We'll treat this as no results.
                displayResults([]);
                displaySources(groundingChunks);
                return; 
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
            clearInterval(timerInterval);
            clearInterval(counterInterval);
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
