; Custom steps for the PaperMind AI Windows installer (electron-builder NSIS).
; After the app files are installed: install Ollama if missing, then download the local AI model.

!ifndef OLLAMA_MODEL
  !define OLLAMA_MODEL "qwen2.5:7b"
!endif

!macro customInstall
  DetailPrint "Checking for Ollama (local AI engine)..."
  StrCpy $0 "$LOCALAPPDATA\Programs\Ollama\ollama.exe"
  IfFileExists "$0" ollama_present 0
    nsExec::ExecToStack 'cmd /c where ollama'
    Pop $1 ; exit code
    Pop $2 ; output (unused)
    StrCmp $1 "0" ollama_on_path 0
      DetailPrint "Downloading Ollama..."
      nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ProgressPreference=\"SilentlyContinue\"; Invoke-WebRequest -UseBasicParsing -Uri https://ollama.com/download/OllamaSetup.exe -OutFile \"$TEMP\OllamaSetup.exe\""'
      Pop $1
      StrCmp $1 "0" +3 0
        MessageBox MB_ICONEXCLAMATION|MB_OK "تعذر تنزيل Ollama. تحقق من اتصال الإنترنت، أو ثبّته يدوياً من ollama.com.$\r$\nCould not download Ollama. Check your internet connection or install it from ollama.com."
        Goto ollama_done
      DetailPrint "Installing Ollama..."
      ExecWait '"$TEMP\OllamaSetup.exe" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES' $1
      Delete "$TEMP\OllamaSetup.exe"
      Goto ollama_present
  ollama_on_path:
    StrCpy $0 "ollama"
  ollama_present:

  ; Make sure the Ollama service is running before pulling the model.
  nsExec::Exec 'powershell -NoProfile -WindowStyle Hidden -Command "if (-not (Get-Process ollama -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden -FilePath \"$0\" -ArgumentList serve }"'
  Pop $1
  Sleep 4000

  DetailPrint "Downloading the AI model ${OLLAMA_MODEL} (this can take a while)..."
  MessageBox MB_ICONINFORMATION|MB_OK "سيتم الآن تنزيل نموذج الذكاء الاصطناعي المحلي (${OLLAMA_MODEL}). قد يستغرق ذلك عدة دقائق حسب سرعة الإنترنت. ستظهر نافذة توضح التقدم.$\r$\nThe local AI model (${OLLAMA_MODEL}) will now be downloaded. A window will show the progress."
  ExecWait 'cmd /c title PaperMind AI - downloading model && "$0" pull ${OLLAMA_MODEL}' $1
  StrCmp $1 "0" ollama_done 0
    MessageBox MB_ICONEXCLAMATION|MB_OK "لم يكتمل تنزيل النموذج. يمكنك إكماله لاحقاً بالأمر: ollama pull ${OLLAMA_MODEL}$\r$\nThe model download did not finish. You can finish it later with: ollama pull ${OLLAMA_MODEL}"
  ollama_done:
!macroend
