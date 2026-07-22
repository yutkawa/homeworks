function handleResponse(response) {
    isLoaded = true; // 応答成功

    // 1. GAS側でシートが空・またはエラーと判定された場合
    if (!response || response.status === "empty_sheet") {
        showError("スプレッドシートに見出し行が設定されていません。");
        return;
    }
    
    if (response.error) {
        showError("GASエラー: " + response.error);
        return;
    }

    // 2. データが0件の場合（見出しのみで宿題データがない）
    const data = response.data || [];
    if (data.length === 0) {
        // 「宿題はありません」の表示処理へ
        renderCards([]);
        renderAlertZone([]);
        return;
    }

    // 3. 正常にデータがある場合
    homeworkData = data;
    updateLastUpdatedTime();
    renderAlertZone(homeworkData);
    renderCards(homeworkData);
}
