// TODO: cache and css stuff
async function fetchDocument() {
    const nextData = JSON.parse(__NEXT_DATA__.innerText);
    const { documentAccess, pageDataList } = nextData.props.pageProps;
    const { url, objectKey, signedQueryParams } = documentAccess;
    const params = signedQueryParams.global;

    const pageContainer = document.createElement('div');
    pageContainer.id = 'page-container';

    const updateProgress = (progress) => document.querySelectorAll('.pdf-download-btn')
        .forEach(downloadButton => downloadButton.textContent = progress);

    const pageCount = pageDataList.length;
    let pageLoaded = 0;

    updateProgress(`Loading pages: 0/${pageCount}`);

    for (const pageData of pageDataList) {
        const { pageNumber, pageHtmlWrapper } = pageData;
        let { pageHtml } = pageData;

        if (!pageHtml) {
            const pageUrl = `${url}${objectKey}${pageNumber}.page${params}`;
            const pageResponse = await fetch(pageUrl);
            pageHtml = await pageResponse.text();

            const backgroundFile = `bg${pageNumber.toString(16)}.png`;
            const backgroundUrl = `${url}${backgroundFile}${params}`
            pageHtml = pageHtml.replace(backgroundFile, backgroundUrl);
        }

        pageHtml = `${pageHtmlWrapper}${pageHtml}</div>`;
        pageContainer.insertAdjacentHTML('beforeend', pageHtml);

        updateProgress(`Loading pages: ${++pageLoaded}/${pageCount}`);
    }

    updateProgress('Downloading document...');

    const styleElement = document.createElement('style');
    styleElement.textContent = `
body > *:not(.p2hv) { 
    display: none !important; 
}
@media print {
    @page {
        margin: 0;
        size: auto;
    }
    body {
        margin: 0;
    }
    #page-container {
        transform: scale(2);
        transform-origin: top left;
    }
    #page-container .pf {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
        break-after: always;
        border: none;
    }
}
`;
    document.head.append(styleElement);

    const viewerElement = document.createElement('div');
    viewerElement.classList.add('p2hv');
    viewerElement.append(pageContainer);

    document.body.append(viewerElement);

    for (const pageElement of pageContainer.children) {
        const imageElement = pageElement.querySelector('img.bi');
        if (!imageElement) {
            continue;
        }

        await new Promise(resolve => {
            if (imageElement.complete && imageElement.naturalWidth > 0) {
                resolve();
                return;
            }

            imageElement.addEventListener('load', resolve, { once: true });
            imageElement.addEventListener('error', resolve, { once: true });
        });
    }

    await document.fonts?.ready;
    await new Promise(r => requestAnimationFrame(r));

    window.print();
    window.addEventListener("afterprint", () => {
        styleElement.remove();
        viewerElement.remove();
    });
}

function createDownloadButton() {
    const topbar = document.querySelector('div[class^="TopbarActions_secondary-actions-wrapper"]');
    if (topbar?.querySelector('.pdf-download-btn')) {
        return;
    }

    const originalButton = topbar.querySelector('button[aria-label^="Download"]');
    if (!originalButton) {
        return;
    }

    const button = originalButton.cloneNode(true);
    button.classList.add('pdf-download-btn');
    button.textContent = 'Download as PDF';

    button.addEventListener('click', fetchDocument);

    topbar.prepend(button);
}

window.addEventListener('load', () => {
    const observer = new MutationObserver(createDownloadButton);
    observer.observe(document.body, { childList: true, subtree: true });
});
