# Script de inicio local para Comercio Fácil México (mxfacil)
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$mysqlData = "$root\.audit\mysql"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Iniciando Comercio Facil Mexico (Entorno Local Completo) " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Iniciar MySQL (puerto 3318)
$mysqlPortOpen = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 3318)
    $tcp.Close()
    $mysqlPortOpen = $true
} catch {
    $mysqlPortOpen = $false
}

if (-not $mysqlPortOpen) {
    Write-Host "[1/3] Iniciando motor MySQL en puerto 3318..." -ForegroundColor Cyan
    $mysqlProc = Start-Process -FilePath $mysqlExe -ArgumentList "--datadir=`"$mysqlData`" --port=3318 --console" -PassThru -WindowStyle Hidden
    
    $attempts = 0
    while (-not $mysqlPortOpen -and $attempts -lt 20) {
        Start-Sleep -Seconds 1
        $attempts++
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", 3318)
            $tcp.Close()
            $mysqlPortOpen = $true
        } catch {
            $mysqlPortOpen = $false
        }
    }
    if ($mysqlPortOpen) {
        Write-Host "  -> MySQL listo en 127.0.0.1:3318." -ForegroundColor Green
    } else {
        Write-Host "  -> Advertencia: MySQL demoró en responder." -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/3] MySQL ya se encuentra activo en 127.0.0.1:3318." -ForegroundColor Green
}

# 2. Iniciar Backend API (puerto 3001)
Write-Host "[2/3] Iniciando API Backend en http://127.0.0.1:3001..." -ForegroundColor Cyan
$backendProc = Start-Process -FilePath "node" -ArgumentList "test/serve-local.js" -WorkingDirectory "$root\backend" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

# 3. Iniciar Frontend Vite (puerto 5173)
Write-Host "[3/3] Iniciando Frontend React + Vite en http://localhost:5173..." -ForegroundColor Cyan
Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host " Accesos rápidos:" -ForegroundColor Yellow
Write-Host " - Tienda / Catálogo:    http://localhost:5173/catalogo" -ForegroundColor White
Write-Host " - Inicio de Sesión:     http://localhost:5173/auth" -ForegroundColor White
Write-Host " - Panel Administrador:  http://localhost:5173/admin/dashboard" -ForegroundColor White
Write-Host " - Panel Vendedor:       http://localhost:5173/vendedor/dashboard" -ForegroundColor White
Write-Host ""
Write-Host " Cuentas de prueba preconfiguradas (contraseña: CompraPrueba!2026):" -ForegroundColor Yellow
Write-Host " - Cliente:  cliente@example.test" -ForegroundColor White
Write-Host " - Admin:    admin@example.test" -ForegroundColor White
Write-Host " - Vendedor: vendedor@example.test" -ForegroundColor White
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host ""

Set-Location "$root\frontend"
npm.cmd run dev
