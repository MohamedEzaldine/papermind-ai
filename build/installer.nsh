; Custom steps for the PaperMind AI Windows installer (electron-builder NSIS).
; After the app files are installed, fully automatic and without console windows:
;   1. install Ollama (the local AI engine) if it is missing
;   2. download the AI model, showing progress inside the installer window
; This file is UTF-8 with BOM so NSIS displays the Arabic text correctly.

!ifndef OLLAMA_MODEL
  !define OLLAMA_MODEL "qwen2.5:7b"
!endif

; Show the progress list by default, so users can see the model download advancing.
!macro customHeader
  ShowInstDetails show
!macroend

!macro customInstall
  SetDetailsPrint both
  DetailPrint "جارِ التحقق من محرك الذكاء الاصطناعي المحلي (Ollama)... / Checking for the local AI engine..."
  StrCpy $0 "$LOCALAPPDATA\Programs\Ollama\ollama.exe"
  IfFileExists "$0" ollama_present 0
    nsExec::ExecToStack 'cmd /c where ollama'
    Pop $1 ; exit code
    Pop $2 ; output (unused)
    StrCmp $1 "0" ollama_on_path 0
      DetailPrint "جارِ تنزيل محرك الذكاء الاصطناعي... / Downloading the local AI engine..."
      nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$$ProgressPreference=\"SilentlyContinue\"; Invoke-WebRequest -UseBasicParsing -Uri https://ollama.com/download/OllamaSetup.exe -OutFile \"$TEMP\OllamaSetup.exe\""'
      Pop $1
      StrCmp $1 "0" +3 0
        MessageBox MB_ICONEXCLAMATION|MB_OK "تعذر تنزيل محرك الذكاء الاصطناعي. تحقق من اتصال الإنترنت ثم أعد تشغيل برنامج التثبيت.$\r$\nCould not download the local AI engine. Check your internet connection and run the installer again."
        Goto ollama_done
      DetailPrint "جارِ تثبيت محرك الذكاء الاصطناعي... / Installing the local AI engine..."
      ExecWait '"$TEMP\OllamaSetup.exe" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' $1
      Delete "$TEMP\OllamaSetup.exe"
      Goto ollama_present
  ollama_on_path:
    StrCpy $0 "ollama"
  ollama_present:

  ; Download the model in the background; progress lines appear in the installer's list.
  DetailPrint "جارِ تنزيل نموذج الذكاء الاصطناعي (${OLLAMA_MODEL})، قد يستغرق ذلك عدة دقائق... / Downloading the AI model, this can take several minutes..."
  InitPluginsDir
  File "/oname=$PLUGINSDIR\pull-model.ps1" "${PROJECT_DIR}\build\pull-model.ps1"
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$PLUGINSDIR\pull-model.ps1" -Model "${OLLAMA_MODEL}" -OllamaExe "$0"'
  Pop $1
  StrCmp $1 "0" model_ready 0
    ; Fallback: pull directly with the Ollama command line (still hidden).
    DetailPrint "محاولة أخرى لتنزيل النموذج... / Retrying the model download..."
    nsExec::ExecToLog '"$0" pull ${OLLAMA_MODEL}'
    Pop $1
    StrCmp $1 "0" model_ready 0
      MessageBox MB_ICONEXCLAMATION|MB_OK "لم يكتمل تنزيل نموذج الذكاء الاصطناعي. تأكد من اتصال الإنترنت ثم أعد تشغيل برنامج التثبيت.$\r$\nThe AI model download did not finish. Check your internet connection and run the installer again."
      Goto ollama_done
  model_ready:
    DetailPrint "تم تجهيز نموذج الذكاء الاصطناعي بنجاح. / The AI model is ready."
  ollama_done:
!macroend
