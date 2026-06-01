import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;
let timerInterval: NodeJS.Timeout | undefined;
let startTime: Date | undefined;
let isTracking = false;

export function activate(context: vscode.ExtensionContext) {
    console.log('InvoiceQu Time Tracker is now active!');

    // 1. Inisialisasi Status Bar Item di pojok kanan bawah
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(clock) InvoiceQu: Idle`;
    statusBarItem.tooltip = 'Klik untuk memulai pencatatan waktu InvoiceQu';
    statusBarItem.command = 'invoicequ.startTracking';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 2. Daftarkan Command: START
    let startCmd = vscode.commands.registerCommand('invoicequ.startTracking', () => {
        if (isTracking) {
            vscode.window.showInformationMessage('InvoiceQu: Timer sudah berjalan aktif!');
            return;
        }

        const config = vscode.workspace.getConfiguration('invoicequ');
        const apiKey = config.get<string>('apiKey');

        if (!apiKey) {
            vscode.window.showErrorMessage('API Key InvoiceQu belum diatur. Buka Settings dan atur "invoicequ.apiKey" terlebih dahulu!', 'Buka Settings')
                .then(selection => {
                    if (selection === 'Buka Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'invoicequ');
                    }
                });
            return;
        }

        startTimer();
    });

    // 3. Daftarkan Command: STOP
    let stopCmd = vscode.commands.registerCommand('invoicequ.stopTracking', () => {
        if (!isTracking) {
            vscode.window.showWarningMessage('InvoiceQu: Tidak ada timer aktif yang sedang berjalan.');
            return;
        }

        stopTimerAndSubmit();
    });

    context.subscriptions.push(startCmd, stopCmd);
}

function startTimer() {
    isTracking = true;
    startTime = new Date();
    statusBarItem.text = `$(play-circle) InvoiceQu: 00:00:00`;
    statusBarItem.tooltip = 'Klik untuk menghentikan dan menyimpan catatan waktu';
    statusBarItem.command = 'invoicequ.stopTracking';
    statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground'); // Warna merah/warning

    vscode.window.showInformationMessage('⏱️ InvoiceQu: Pelacak waktu kerja dimulai!');

    timerInterval = setInterval(() => {
        if (startTime) {
            const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
            statusBarItem.text = `$(play-circle) InvoiceQu: ${formatTimer(elapsed)}`;
        }
    }, 1000);
}

async function stopTimerAndSubmit() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }

    isTracking = false;
    const endTime = new Date();
    const durationSeconds = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;

    // Reset status bar ke posisi idle
    statusBarItem.text = `$(clock) InvoiceQu: Idle`;
    statusBarItem.tooltip = 'Klik untuk memulai pencatatan waktu InvoiceQu';
    statusBarItem.command = 'invoicequ.startTracking';
    statusBarItem.color = undefined;

    if (durationSeconds < 10) {
        vscode.window.showWarningMessage('⚠️ Sesi terlalu singkat (kurang dari 10 detik). Tidak disimpan ke InvoiceQu.');
        return;
    }

    const config = vscode.workspace.getConfiguration('invoicequ');
    const apiKey = config.get<string>('apiKey');
    const taskId = config.get<string>('defaultTaskId') || "45f034b9-0aef-4c78-8a4f-92af4b556593"; // Default ke task "Membuat Landing Page"
    const taskIdClean = taskId.trim();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "InvoiceQu: Mengirim catatan waktu...",
        cancellable: false
    }, async () => {
        try {
            const response = await fetch('https://api.invoicequ.my.id/api/v1/time-entries', {
                method: 'POST',
                headers: {
                    'Authorization': `ApiKey ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_id: taskIdClean,
                    task_title: "Membuat Landing Page", // Bisa dinamis nanti
                    project_name: "Website",
                    date: formatLocalDate(startTime || new Date()),
                    start_time: formatLocalTime(startTime || new Date()),
                    end_time: formatLocalTime(endTime),
                    duration_seconds: durationSeconds,
                    notes: "Coding session via Official VS Code Extension"
                })
            });

            const result: any = await response.json();
            if (result.error) {
                vscode.window.showErrorMessage(`❌ Gagal menyimpan ke InvoiceQu: ${result.error}`);
            } else {
                const minutes = Math.floor(durationSeconds / 60);
                vscode.window.showInformationMessage(`✅ Berhasil mencatat ${minutes} menit kerja ke InvoiceQu!`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Gagal terhubung ke API InvoiceQu: ${error.message}`);
        }
    });
}

function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

export function deactivate() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
}
