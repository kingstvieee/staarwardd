# Troubleshooting

## node or npm is not recognized

Install Node.js 20 LTS or newer. Close every PowerShell window, open a new one, and verify:

~~~powershell
node --version
npm --version
~~~

A full computer restart is normally unnecessary.

## PowerShell starts in C:\WINDOWS\system32

That folder is not the app. Use the real quoted project path:

~~~powershell
cd "C:\Users\sevyn\Documents\Codex\2026-07-18\build-the-actual-blessync-working-prototype"
npm install
npm test
npm run dev
~~~

Do not type the sample placeholder C:\path\to\....

## EPERM or package-lock permission error

This normally means npm was run from C:\WINDOWS\system32 or another protected folder. Change to the project folder first. Do not run the project as Administrator unless Windows still blocks the actual project folder.

If OneDrive Controlled Folder Access blocks Node:

1. Open Windows Security.
2. Select Virus & threat protection.
3. Select Ransomware protection, then Manage ransomware protection.
4. Select Allow an app through Controlled folder access.
5. Allow node.exe from the installed Node.js folder.
6. Reopen PowerShell in the project folder.

Prefer allowing Node over disabling security protection globally.

## Port 3000 is already in use

Find the process:

~~~powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
~~~

Stop only the displayed process ID:

~~~powershell
Stop-Process -Id 12345
~~~

Replace 12345 with the actual ID, then run npm run dev.

Or use another port:

~~~powershell
$env:PORT=3001
npm run dev
~~~

## Page is stale or the old opening returns

Press Ctrl+F5, or close the tab and reopen http://localhost:3000. The server sends Cache-Control: no-store.

## Talk button does not hear me

Use current Microsoft Edge or Chrome. Select the lock/site icon near the address bar, allow Microphone, reload, complete the awakening, open a portal, and press Talk. Windows Settings > Privacy & security > Microphone must also allow desktop apps.

Typing always remains available.

## StaarWardd does not speak

Turn Sound on. Confirm the browser tab is not muted and the Windows output device/volume is correct. Browser speech synthesis is separate from the cinematic music.

## OpenAI mode does not activate

The repository-root file must be named exactly .env, not .env.txt. Restart npm run dev, then open:

http://localhost:3000/api/status

Expected configured response includes mode openai and model gpt-5.6.

## OpenAI returns 429 or the UI says deterministic fallback

A 429 means the key reached OpenAI but the API project has no remaining quota or billing. Codex/Build Week credits are not API credits. Add API billing or credits to the OpenAI project, wait a few minutes, restart the server, and retry. Deterministic mode remains fully functional without this.

## Tests fail

Use Node 20 or newer, then run:

~~~powershell
npm run check
npm test
~~~

Tests intentionally force deterministic mode and do not spend API credits.

## START_WINDOWS.bat closes immediately

Open PowerShell in the project folder and run npm run dev so the full error stays visible.

## The old or stale cinematic still appears

Chrome can keep the previous large image sequence in memory even after the files change.

1. Leave npm run dev running.
2. Open http://localhost:3000/?v=flight7.
3. Press Ctrl+Shift+R once for a hard refresh.
4. Click Start the awakening; browser sound must begin from this click.
5. If the old scene remains, close only the StaarWardd tab, reopen the URL above, and start again. A full PC restart is not required.