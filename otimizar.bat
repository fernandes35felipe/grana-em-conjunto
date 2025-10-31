@echo off
echo.
echo ========================================
echo   OTIMIZACAO DE BUNDLE - ASSISTENTE
echo ========================================
echo.

:MENU
echo.
echo Escolha uma opcao:
echo.
echo 1. Criar arquivos lib/icons.ts e lib/date.ts
echo 2. Listar arquivos que precisam atualizacao
echo 3. Limpar node_modules e reinstalar
echo 4. Executar build
echo 5. Analisar tamanho do bundle
echo 6. Validar migracao (verificar imports diretos)
echo 7. Executar tudo (passos 1-6)
echo 0. Sair
echo.
set /p opcao="Digite o numero da opcao: "

if "%opcao%"=="1" goto CRIAR_ARQUIVOS
if "%opcao%"=="2" goto LISTAR_ARQUIVOS
if "%opcao%"=="3" goto LIMPAR_REINSTALAR
if "%opcao%"=="4" goto BUILD
if "%opcao%"=="5" goto ANALISAR
if "%opcao%"=="6" goto VALIDAR
if "%opcao%"=="7" goto TUDO
if "%opcao%"=="0" goto FIM
goto MENU

:CRIAR_ARQUIVOS
echo.
echo [PASSO 1/3] Criando diretorio src\lib...
if not exist "src\lib" mkdir "src\lib"

echo [PASSO 2/3] Criando src\lib\icons.ts...
(
echo export { 
echo   ArrowUpCircle,
echo   ArrowDownCircle,
echo   TrendingUp,
echo   TrendingDown,
echo   DollarSign,
echo   PiggyBank,
echo   Calendar,
echo   Search,
echo   Filter,
echo   Plus,
echo   Trash2,
echo   Eye,
echo   Edit,
echo   X,
echo   Check,
echo   ChevronLeft,
echo   ChevronRight,
echo   Menu,
echo   LogOut,
echo   Users,
echo   Settings,
echo   Home,
echo   FileText,
echo   Target,
echo   Wallet,
echo   AlertCircle,
echo   Info,
echo   ChevronDown,
echo   MoreHorizontal,
echo } from 'lucide-react';
) > "src\lib\icons.ts"

echo [PASSO 3/3] Criando src\lib\date.ts...
(
echo export {
echo   format,
echo   startOfMonth,
echo   endOfMonth,
echo   startOfYear,
echo   endOfYear,
echo   subMonths,
echo   addMonths,
echo   isAfter,
echo   isBefore,
echo   parseISO,
echo   addDays,
echo   subDays,
echo } from 'date-fns';
echo.
echo export { ptBR } from 'date-fns/locale';
) > "src\lib\date.ts"

echo.
echo Arquivos criados com sucesso!
echo.
pause
goto MENU

:LISTAR_ARQUIVOS
echo.
echo ========================================
echo   ARQUIVOS COM IMPORTS LUCIDE-REACT
echo ========================================
echo.
findstr /S /M "lucide-react" src\*.tsx src\*.ts 2>nul
echo.
echo ========================================
echo   ARQUIVOS COM IMPORTS DATE-FNS
echo ========================================
echo.
findstr /S /M "date-fns" src\*.tsx src\*.ts 2>nul
echo.
echo.
echo ATENCAO: Voce precisa atualizar MANUALMENTE estes arquivos!
echo.
echo Substitua:
echo   from 'lucide-react' - from '@/lib/icons'
echo   from 'date-fns' - from '@/lib/date'
echo   from 'date-fns/locale' - from '@/lib/date'
echo.
pause
goto MENU

:LIMPAR_REINSTALAR
echo.
echo [PASSO 1/4] Removendo node_modules...
if exist "node_modules" rmdir /S /Q "node_modules"

echo [PASSO 2/4] Removendo dist...
if exist "dist" rmdir /S /Q "dist"

echo [PASSO 3/4] Removendo package-lock.json...
if exist "package-lock.json" del /F /Q "package-lock.json"

echo [PASSO 4/4] Reinstalando dependencias...
call npm install

echo.
echo Dependencias reinstaladas!
echo.
pause
goto MENU

:BUILD
echo.
echo Executando build...
echo.
call npm run build
echo.
if %ERRORLEVEL% EQU 0 (
    echo Build concluido com sucesso!
) else (
    echo Build falhou! Verifique os erros acima.
)
echo.
pause
goto MENU

:ANALISAR
echo.
echo ========================================
echo   ANALISE DE BUNDLE SIZE
echo ========================================
echo.
if not exist "dist" (
    echo Pasta dist nao encontrada!
    echo Execute o build primeiro opcao 4
    echo.
    pause
    goto MENU
)

echo Arquivos JavaScript gerados:
echo.
dir "dist\assets\js\*.js" 2>nul
echo.
echo ----------------------------------------
echo Tamanho total da pasta dist:
echo.
dir dist /s | find "File(s)"
echo.
echo ========================================
pause
goto MENU

:VALIDAR
echo.
echo ========================================
echo   VALIDACAO DE MIGRACAO
echo ========================================
echo.
echo Procurando imports diretos de lucide-react...
findstr /S "from 'lucide-react'" src\*.tsx src\*.ts 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Nenhum import direto de lucide-react encontrado!
) else (
    echo Ainda existem imports diretos! Atualize-os manualmente.
)

echo.
echo Procurando imports diretos de date-fns...
findstr /S "from 'date-fns'" src\*.tsx src\*.ts 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Nenhum import direto de date-fns encontrado!
) else (
    echo Ainda existem imports diretos! Atualize-os manualmente.
)

echo.
echo ========================================
pause
goto MENU

:TUDO
echo.
echo ========================================
echo   EXECUTANDO TODOS OS PASSOS
echo ========================================
echo.

echo [1/6] Criando arquivos lib...
call :CRIAR_ARQUIVOS_SILENCIOSO

echo.
echo [2/6] Listando arquivos que precisam atualizacao...
echo.
echo ATENCAO: Atualize MANUALMENTE os imports nos arquivos listados!
echo.
findstr /S /M "lucide-react" src\*.tsx src\*.ts 2>nul
findstr /S /M "date-fns" src\*.tsx src\*.ts 2>nul
echo.
echo Pressione qualquer tecla APOS atualizar os imports...
pause >nul

echo.
echo [3/6] Limpando e reinstalando...
call :LIMPAR_REINSTALAR_SILENCIOSO

echo.
echo [4/6] Executando build...
call npm run build

echo.
echo [5/6] Analisando bundle...
if exist "dist" (
    dir "dist\assets\js\*.js" 2>nul
    dir dist /s | find "File(s)"
)

echo.
echo [6/6] Validando migracao...
findstr /S "from 'lucide-react'" src\*.tsx src\*.ts 2>nul
findstr /S "from 'date-fns'" src\*.tsx src\*.ts 2>nul

echo.
echo ========================================
echo   PROCESSO CONCLUIDO!
echo ========================================
echo.
pause
goto MENU

:CRIAR_ARQUIVOS_SILENCIOSO
if not exist "src\lib" mkdir "src\lib"
(
echo export { 
echo   ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, DollarSign,
echo   PiggyBank, Calendar, Search, Filter, Plus, Trash2, Eye, Edit, X, Check,
echo   ChevronLeft, ChevronRight, Menu, LogOut, Users, Settings, Home, FileText,
echo   Target, Wallet, AlertCircle, Info, ChevronDown, MoreHorizontal
echo } from 'lucide-react';
) > "src\lib\icons.ts"
(
echo export { format, startOfMonth, endOfMonth, startOfYear, endOfYear,
echo   subMonths, addMonths, isAfter, isBefore, parseISO, addDays, subDays
echo } from 'date-fns';
echo export { ptBR } from 'date-fns/locale';
) > "src\lib\date.ts"
goto :eof

:LIMPAR_REINSTALAR_SILENCIOSO
if exist "node_modules" rmdir /S /Q "node_modules"
if exist "dist" rmdir /S /Q "dist"
if exist "package-lock.json" del /F /Q "package-lock.json"
call npm install
goto :eof

:FIM
echo.
echo Saindo...
echo.
exit /b 0