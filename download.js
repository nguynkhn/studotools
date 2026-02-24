const styleElement = document.createElement('style');
styleElement.textContent = `body > *:not(.p2hv) {
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
}`;
const viewerElement = document.createElement('div');
viewerElement.classList.add('p2hv');

let downloadButton;

async function fetchDocument() {
    downloadButton.textContent = 'Fetching document...';

    const nextData = JSON.parse(__NEXT_DATA__.innerText);
    const { documentAccess, pageDataList } = nextData.props.pageProps;
    const { url, objectKey, signedQueryParams } = documentAccess;
    const params = signedQueryParams.global;

    const pageContainer = document.createElement('div');
    pageContainer.id = 'page-container';

    const pageHtmls = await Promise.all(pageDataList.map(async ({ pageNumber, pageHtml, pageHtmlWrapper }) => {
        if (!pageHtml) {
            const pageUrl = `${url}${objectKey}${pageNumber}.page${params}`;
            const pageResponse = await fetch(pageUrl);
            pageHtml = await pageResponse.text();

            const backgroundFile = `bg${pageNumber.toString(16)}.png`;
            const backgroundUrl = `${url}${backgroundFile}${params}`
            pageHtml = pageHtml.replaceAll(backgroundFile, backgroundUrl);
        }

        return `${pageHtmlWrapper}${pageHtml}</div>`;
    }));
    pageContainer.innerHTML = pageHtmls.join('');
    viewerElement.append(pageContainer);

    const pageImages = [...pageContainer.querySelectorAll('img.bi')];
    const pageCount = pageImages.length;
    let pageLoaded = 0;

    downloadButton.textContent = `Loading pages: 0/${pageCount}`;

    await Promise.all(pageImages.map(imageElement => imageElement.decode?.()
        .then(() => downloadButton.textContent = `Loading pages: ${++pageLoaded}/${pageCount}`)
        .catch(() => {})
    ));
}

async function downloadPDF() {
    if (!viewerElement.hasChildNodes()) {
        await fetchDocument();
    }

    document.head.append(styleElement);
    document.body.append(viewerElement);

    await document.fonts?.ready;
    await new Promise(r => requestAnimationFrame(r));

    window.print();
}

function createDownloadButton() {
    const topbar = document.querySelector('div[class^="TopbarActions_secondary-actions-wrapper"]');
    if (topbar?.querySelector('.pdf-download-btn')) {
        return;
    }

    if (!downloadButton) {
        const originalButton = topbar.querySelector('button[aria-label^="Download"]');
        if (!originalButton) {
            return;
        }

        downloadButton = originalButton.cloneNode(true);
        downloadButton.classList.add('pdf-download-btn');
        downloadButton.textContent = 'Download as PDF';

        downloadButton.addEventListener('click', downloadPDF);
    }

    topbar.prepend(downloadButton);
}

window.addEventListener('load', () => {
    const observer = new MutationObserver(createDownloadButton);
    observer.observe(document.body, { childList: true, subtree: true });
});

window.addEventListener("afterprint", () => {
    styleElement.remove();
    viewerElement.remove();
    downloadButton.textContent = 'Download as PDF';
});
