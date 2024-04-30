const GITHUB_TOKEN = "";

const stylizePrList = () => {
    if (!window.location.href.includes('/pulls')) return;

    const headerContainer = document.querySelector(".Box-header .d-flex .flex-justify-between");
    if (headerContainer.childNodes.length > 11) return;

    const baseUrl = window.location.href;
    const [_, __, ___, owner, repo] = baseUrl.split('/');

    const getPRNumber = (element) => {
        const prNumberTextElement = element.querySelector("span.opened-by");
        if (prNumberTextElement) {
            const prNumberText = prNumberTextElement.textContent.trim();
            const prNumberMatch = prNumberText.match(/#\d+/);
            return prNumberMatch ? parseInt(prNumberMatch[0].substring(1), 10) : null;
        }
        return null;
    };

    const fetchPRDetails = async (prNumber) => {
        const headers = {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json"
        };
        const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
        const reviewsUrl = `${prUrl}/reviews`;

        const [prResponse, reviewsResponse] = await Promise.all([
            fetch(prUrl, {headers}),
            fetch(reviewsUrl, {headers})
        ]);

        const prData = await prResponse.json();
        const reviewsData = await reviewsResponse.json();

        const isInReview = prData.requested_reviewers.length > 0;
        const isApproved = (reviewsData[reviewsData.length - 1])?.state === "APPROVED";
        const isInFeedback = reviewsData.some(review => review.state === "CHANGES_REQUESTED");
        const needRebase = !prData.rebaseable;

        return {prNumber, isInReview, isInFeedback, needRebase, isApproved};
    };

    const createWarning = (text) => {
        const warning = document.createElement("p");
        warning.className = "warning-badge"
        warning.textContent = text;

        return warning
    }

    const addBadge = (element, {isInReview, isInFeedback, needRebase, isApproved}) => {
        const statusContainer = element.querySelector(".d-flex");
        const warningContainer = element.querySelector(".flex-auto")

        const statusColumn = document.createElement("div");
        statusColumn.style = "display: flex; justify-content: center; align-items: center;";
        statusColumn.style.width = "150px";
        const statusBadge = document.createElement("span");
        statusBadge.className = "status-badge";

        if (isApproved) {
            statusBadge.className = "status-badge status-approved"
            statusBadge.textContent = "Approved ✅";
        } else if (isInReview) {
            statusBadge.className = "status-badge status-review"
            statusBadge.textContent = "Review 👀";
        } else if (isInFeedback) {
            statusBadge.className = "status-badge status-feedback"
            statusBadge.textContent = "Feedback 🚨";
        } else {
            statusBadge.className = "status-badge status-wip"
            statusBadge.textContent = "WIP 🚧";
        }

        if (needRebase) {
            const warning = createWarning("Rebase needed ⛔️")
            warningContainer.appendChild(warning)
        }

        statusColumn.appendChild(statusBadge);
        statusContainer.appendChild(statusColumn);
    };

    const addHeader = () => {
        const headerStatus = document.createElement("div");
        headerStatus.className = "btn-link details-reset details-overlay d-inline-block text-center position-relative pr-3 pr-sm-0 px-3";
        headerStatus.textContent = "Status";
        headerStatus.style.width = "150px";

        headerContainer.appendChild(headerStatus);
    };

    const processPRs = async () => {
        const prElements = document.querySelectorAll(".js-issue-row");
        addHeader();

        const prDetailsPromises = Array.from(prElements).map(element => {
            const prNumber = getPRNumber(element);
            return prNumber ? fetchPRDetails(prNumber).then(details => ({element, details})) : null;
        }).filter(p => p !== null);

        const prDetails = await Promise.all(prDetailsPromises);

        prDetails.forEach(({element, details}) => {
            addBadge(element, details);
        });
    };

    processPRs();
};

document.addEventListener("DOMContentLoaded", () => {
    let currentUrl;

    setInterval(() => {
        if (!currentUrl || currentUrl !== window.location.href) {
            stylizePrList()
            currentUrl = window.location.href;
        }
    }, 1000)
})