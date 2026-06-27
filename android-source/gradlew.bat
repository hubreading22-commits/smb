@echo off
set "DIR=%~dp0"
set "WRAPPER_JAR=%DIR%gradle\wrapper\gradle-wrapper.jar"

if not exist "%WRAPPER_JAR%" (
    echo gradle-wrapper.jar not found. Fetching from official repository...
    if not exist "%DIR%gradle\wrapper" mkdir "%DIR%gradle\wrapper"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar', '%WRAPPER_JAR%')"
)

java -classpath "%WRAPPER_JAR%" org.gradle.wrapper.GradleWrapperMain %*
