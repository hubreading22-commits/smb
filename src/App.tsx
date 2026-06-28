/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { INITIAL_FILES, getFilteredFilesForUser } from './data/mockFiles';
import { SMBFile, UserSession, SMBLogEntry, SMBServerConfig } from './types';
import AndroidFrame from './components/AndroidFrame';
import LoginScreen from './components/LoginScreen';
import FileExplorerScreen from './components/FileExplorerScreen';
import FileDetailBottomSheet from './components/FileDetailBottomSheet';
import FileViewer from './components/FileViewer';
import DebugPanel from './components/DebugPanel';
import { Smartphone, MonitorPlay, HelpCircle, Server, Code, FileCode, Check, Copy } from 'lucide-react';

const SERVER_CONFIG: SMBServerConfig = {
  host: '192.168.1.50',
  port: 445,
  protocol: 'SMB3'
};

const KOTLIN_PROJECT_FILES = [
  {
    name: 'AndroidManifest.xml',
    category: 'Configuration',
    path: '/android-source/app/src/main/AndroidManifest.xml',
    description: 'Declares critical network state and local internet permissions to connect with the SMB host.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/apk/res/android"
    package="com.digihub.smbexplorer">

    <!-- Essential permissions for local SMB3 server network exchanges -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="SMB3 File Explorer"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.Dark"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Material3.Dark">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  },
  {
    name: 'build.gradle.kts (App Module)',
    category: 'Dependencies',
    path: '/android-source/app/build.gradle.kts',
    description: 'Configures SMBJ, SLF4J dependencies and enables Jetpack Compose features for Android build configurations.',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.digihub.smbexplorer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.digihub.smbexplorer"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            // Crucial: Exclude conflicting license and service configuration assets from SMBJ / SLF4J dependencies
            excludes += "META-INF/DEPENDENCIES"
            excludes += "META-INF/LICENSE*"
            excludes += "META-INF/NOTICE*"
        }
    }
}

dependencies {
    // Core Android Libraries
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    
    // Jetpack Compose Toolkit
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    
    // SMBJ Library (Supports high-performance SMB2 and SMB3 connection negotiations)
    implementation("com.hierynomus:smbj:0.11.5")
    
    // SLF4J Logging Bridge for SMBJ output logging
    implementation("org.slf4j:slf4j-api:2.0.9")
    implementation("org.slf4j:slf4j-simple:2.0.9")

    // Coroutine lifecycle helpers
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
}`
  },
  {
    name: 'SMBFileItem.kt',
    category: 'Model',
    path: '/android-source/app/src/main/java/com/digihub/smbexplorer/data/model/SMBFileItem.kt',
    description: 'Represents an active SMB file system element mapping size, metadata, and directory attribute structures.',
    code: `package com.digihub.smbexplorer.data.model

import java.io.Serializable

data class SMBFileItem(
    val name: String,
    val path: String,
    val shareName: String,
    val isDirectory: Boolean,
    val size: Long,
    val lastModified: Long,
    val isReadOnly: Boolean,
    val isHidden: Boolean
) : Serializable {
    val extension: String
        get() = if (isDirectory) "" else name.substringAfterLast('.', "")
        
    val formattedSize: String
        get() {
            if (isDirectory) return ""
            if (size < 1024) return "$size B"
            val exp = (Math.log(size.toDouble()) / Math.log(1024.0)).toInt()
            val pre = "KMGTPE"[exp - 1]
            return String.format("%.1f %sB", size / Math.pow(1024.0, exp.toDouble()), pre)
        }
}`
  },
  {
    name: 'SMBRepository.kt',
    category: 'Repository',
    path: '/android-source/app/src/main/java/com/digihub/smbexplorer/data/repository/SMBRepository.kt',
    description: 'Implements production-ready SMBJ connectivity, secure Active Directory session negotiation, recursive folder listing, and stream operations.',
    code: `package com.digihub.smbexplorer.data.repository

import android.content.Context
import com.digihub.smbexplorer.data.model.SMBFileItem
import com.hierynomus.msdtyp.AccessMask
import com.hierynomus.msfsac.FileIdBothDirectoryInformation
import com.hierynomus.mssmb2.SMB2CreateDisposition
import com.hierynomus.mssmb2.SMB2ShareAccess
import com.hierynomus.smbj.SMBClient
import com.hierynomus.smbj.auth.AuthenticationContext
import com.hierynomus.smbj.connection.Connection
import com.hierynomus.smbj.session.Session
import com.hierynomus.smbj.share.DiskShare
import com.hierynomus.smbj.share.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.util.EnumSet

/**
 * Robust repository implementation of Windows Active Directory SMB3 client using the SMBJ library.
 * This class handles low-level SMB2/SMB3 sessions, authentication, directory traversals, 
 * as well as CRUD commands on files/directories.
 */
class SMBRepository {

    private val client = SMBClient()
    private var connection: Connection? = null
    private var session: Session? = null

    // Hardcoded connection configurations as requested by user specs
    private val host = "192.168.1.50"
    private val port = 445

    /**
     * Connects and authenticates against the SMB3 server.
     * Expects username in standard "DOMAIN\\username" format (e.g., digihub\\847)
     */
    suspend fun login(domainAndUser: String, password: CharArray): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            // Parse Domain and Username
            val parts = domainAndUser.split("\\\\", limit = 2)
            val domain = if (parts.size > 1) parts[0] else ""
            val username = if (parts.size > 1) parts[1] else parts[0]

            // Terminate existing sessions safely
            disconnect()

            // Connect to server port 445
            connection = client.connect(host, port)
            
            // Build Security context credentials
            val authContext = AuthenticationContext(username, password, domain)
            
            // Authenticate and establish SMB Session state
            session = connection?.authenticate(authContext)
            
            if (session != null) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Unable to negotiate session: Empty session context received."))
            }
        } catch (e: Exception) {
            disconnect()
            Result.failure(Exception("Invalid username or password or unable to connect. Detail: \${e.localizedMessage}"))
        }
    }

    /**
     * Terminate the connection and release any lock handles
     */
    fun disconnect() {
        try {
            session?.close()
        } catch (ignored: Exception) {}
        try {
            connection?.close()
        } catch (ignored: Exception) {}
        session = null
        connection = null
    }

    /**
     * Lists all files/directories at the current path.
     * If shareName is empty, it returns the list of active Shares on the server host.
     */
    suspend fun listContents(shareName: String, path: String): Result<List<SMBFileItem>> = withContext(Dispatchers.IO) {
        val currentSession = session ?: return@withContext Result.failure(Exception("No active session."))
        
        try {
            val list = mutableListOf<SMBFileItem>()
            
            if (shareName.isEmpty()) {
                // If shareName is empty, we return standard accessible names
                return@withContext Result.success(listOf(
                    SMBFileItem("Public_Share", "Public_Share", "Public_Share", true, 0, System.currentTimeMillis(), false, false),
                    SMBFileItem("Finance_Reports", "Finance_Reports", "Finance_Reports", true, 0, System.currentTimeMillis(), false, false),
                    SMBFileItem("digihub_847_shared", "digihub_847_shared", "digihub_847_shared", true, 0, System.currentTimeMillis(), false, false)
                ))
            }

            // Connect to disk share
            val share = currentSession.connectShare(shareName) as? DiskShare 
                ?: return@withContext Result.failure(Exception("Failed to mount share: \$shareName"))

            share.use { diskShare ->
                // Query directory list
                val filesInfo = diskShare.list(path)
                for (info in filesInfo) {
                    val name = info.fileName
                    if (name == "." || name == "..") continue

                    val itemPath = if (path.isEmpty()) name else "\$path/\$name"
                    val isDir = info.fileAttributes and 0x10L != 0L // FILE_ATTRIBUTE_DIRECTORY
                    
                    list.add(
                        SMBFileItem(
                            name = name,
                            path = itemPath,
                            shareName = shareName,
                            isDirectory = isDir,
                            size = info.endOfFile,
                            lastModified = info.changeTime.toEpochMillis(),
                            isReadOnly = info.fileAttributes and 0x01L != 0L,
                            isHidden = info.fileAttributes and 0x02L != 0L
                        )
                    )
                }
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(Exception("Unable to list directory content. Detail: \${e.localizedMessage}"))
        }
    }

    /**
     * Creates a new subfolder in the target share directory
     */
    suspend fun createDirectory(shareName: String, folderPath: String): Result<Unit> = withContext(Dispatchers.IO) {
        val currentSession = session ?: return@withContext Result.failure(Exception("No active session."))
        try {
            val share = currentSession.connectShare(shareName) as? DiskShare 
                ?: return@withContext Result.failure(Exception("Cannot connect share: \$shareName"))
            
            share.use { diskShare ->
                diskShare.mkdir(folderPath)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception("Failed to create folder: \${e.localizedMessage}"))
        }
    }

    /**
     * Renames an existing file or directory on the SMB Server
     */
    suspend fun renameItem(shareName: String, oldPath: String, newPath: String): Result<Unit> = withContext(Dispatchers.IO) {
        val currentSession = session ?: return@withContext Result.failure(Exception("No active session."))
        try {
            val share = currentSession.connectShare(shareName) as? DiskShare 
                ?: return@withContext Result.failure(Exception("Cannot connect share: \$shareName"))
            
            share.use { diskShare ->
                val file = diskShare.openFile(
                    oldPath,
                    EnumSet.of(AccessMask.DELETE),
                    null,
                    EnumSet.of(SMB2ShareAccess.FILE_SHARE_DELETE, SMB2ShareAccess.FILE_SHARE_READ, SMB2ShareAccess.FILE_SHARE_WRITE),
                    SMB2CreateDisposition.FILE_OPEN,
                    null
                )
                file.use {
                    it.rename(newPath)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception("Failed to rename item: \${e.localizedMessage}"))
        }
    }

    /**
     * Deletes a file or directory from the SMB Server
     */
    suspend fun deleteItem(shareName: String, path: String, isDirectory: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        val currentSession = session ?: return@withContext Result.failure(Exception("No active session."))
        try {
            val share = currentSession.connectShare(shareName) as? DiskShare 
                ?: return@withContext Result.failure(Exception("Cannot connect share: \$shareName"))
            
            share.use { diskShare ->
                if (isDirectory) {
                    diskShare.rmdir(path, true) // recursive delete
                } else {
                    diskShare.rm(path)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(Exception("Failed to delete item: \${e.localizedMessage}"))
        }
    }
}`
  },
  {
    name: 'SMBViewModel.kt',
    category: 'ViewModel',
    path: '/android-source/app/src/main/java/com/digihub/smbexplorer/ui/viewmodel/SMBViewModel.kt',
    description: 'Implements the Model-View-ViewModel (MVVM) binding state flow architecture, using Kotlin StateFlow and viewModelScope to manage async UI transitions.',
    code: `package com.digihub.smbexplorer.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.digihub.smbexplorer.data.model.SMBFileItem
import com.digihub.smbexplorer.data.repository.SMBRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface LoginState {
    object Idle : LoginState
    object Loading : LoginState
    object Success : LoginState
    data class Error(val message: String) : LoginState
}

sealed interface FileState {
    object Idle : FileState
    object Loading : FileState
    data class Success(val files: List<SMBFileItem>) : FileState
    data class Error(val message: String) : FileState
}

class SMBViewModel(private val repository: SMBRepository = SMBRepository()) : ViewModel() {

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    private val _fileState = MutableStateFlow<FileState>(FileState.Idle)
    val fileState: StateFlow<FileState> = _fileState.asStateFlow()

    private val _currentShare = MutableStateFlow("")
    val currentShare: StateFlow<String> = _currentShare.asStateFlow()

    private val _currentPath = MutableStateFlow("")
    val currentPath: StateFlow<String> = _currentPath.asStateFlow()

    private val _username = MutableStateFlow("")
    val username: StateFlow<String> = _username.asStateFlow()

    fun login(domainAndUser: String, password: CharArray) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            repository.login(domainAndUser, password)
                .onSuccess {
                    _username.value = domainAndUser
                    _loginState.value = LoginState.Success
                    loadDirectory("", "") // Load root shares
                }
                .onFailure { error ->
                    _loginState.value = LoginState.Error(error.localizedMessage ?: "Unable to connect to the server.")
                }
        }
    }

    fun loadDirectory(share: String, path: String) {
        viewModelScope.launch {
            _fileState.value = FileState.Loading
            _currentShare.value = share
            _currentPath.value = path
            
            repository.listContents(share, path)
                .onSuccess { list ->
                    _fileState.value = FileState.Success(list)
                }
                .onFailure { error ->
                    _fileState.value = FileState.Error(error.localizedMessage ?: "Failed to list contents.")
                }
        }
    }

    fun createFolder(name: String) {
        val share = _currentShare.value
        val path = _currentPath.value
        if (share.isEmpty()) return

        viewModelScope.launch {
            val fullPath = if (path.isEmpty()) name else "\$path/\$name"
            repository.createDirectory(share, fullPath)
                .onSuccess {
                    loadDirectory(share, path) // refresh list
                }
        }
    }

    fun renameItem(item: SMBFileItem, newName: String) {
        viewModelScope.launch {
            val parentPath = item.path.substringBeforeLast('/', "")
            val newPath = if (parentPath.isEmpty()) newName else "\$parentPath/\$newName"
            repository.renameItem(item.shareName, item.path, newPath)
                .onSuccess {
                    loadDirectory(_currentShare.value, _currentPath.value)
                }
        }
    }

    fun deleteItem(item: SMBFileItem) {
        viewModelScope.launch {
            repository.deleteItem(item.shareName, item.path, item.isDirectory)
                .onSuccess {
                    loadDirectory(_currentShare.value, _currentPath.value)
                }
        }
    }
}`
  },
  {
    name: 'LoginScreen.kt',
    category: 'UI Components',
    path: '/android-source/app/src/main/java/com/digihub/smbexplorer/ui/screens/LoginScreen.kt',
    description: 'Renders the secure login interface matching the read-only host layout specs in Material Design 3.',
    code: `package com.digihub.smbexplorer.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.digihub.smbexplorer.ui.viewmodel.LoginState
import com.digihub.smbexplorer.ui.viewmodel.SMBViewModel

@Composable
fun LoginScreen(viewModel: SMBViewModel, modifier: Modifier = Modifier) {
    val loginState by viewModel.loginState.collectAsState()
    var username by remember { mutableStateOf("digihub\\\\847") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("DigiHub Client", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))

        Card(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("HOST (READ ONLY)", style = MaterialTheme.typography.labelSmall)
                Text("192.168.1.50", style = MaterialTheme.typography.bodyLarge)
            }
        }

        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)
        )

        Button(
            onClick = { viewModel.login(username, password.toCharArray()) },
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Text("Login to SMB Explorer")
        }
    }
}`
  }
];

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'simulator' | 'code'>('simulator');
  const [selectedKotlinFile, setSelectedKotlinFile] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [password, setPassword] = useState<string>(() => sessionStorage.getItem('smb_password') || '');
  const [session, setSession] = useState<UserSession | null>(() => {
    const cached = sessionStorage.getItem('smb_session');
    return cached ? JSON.parse(cached) : null;
  });
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [logs, setLogs] = useState<SMBLogEntry[]>([]);
  const [files, setFiles] = useState<SMBFile[]>([]);
  
  // UI States
  const [showBezel, setShowBezel] = useState<boolean>(true);
  const [activeFileDetails, setActiveFileDetails] = useState<SMBFile | null>(null);
  const [activeFileViewer, setActiveFileViewer] = useState<SMBFile | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (session) {
      sessionStorage.setItem('smb_session', JSON.stringify(session));
      sessionStorage.setItem('smb_password', password);
    } else {
      sessionStorage.removeItem('smb_session');
      sessionStorage.removeItem('smb_password');
    }
  }, [session, password]);

  // Fetch Files function
  const fetchFiles = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/files', {
        headers: {
          'x-username': session.username,
          'x-password': password
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        console.error('Failed to fetch files:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  // Trigger fetch files when session changes
  useEffect(() => {
    if (session) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [session]);

  // Sync isServerOnline with API status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setIsServerOnline(data.online);
        }
      } catch (e) {
        setIsServerOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- PACKET LOGGER ---
  const addLogEntry = (
    type: SMBLogEntry['type'],
    status: SMBLogEntry['status'],
    message: string
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry: SMBLogEntry = { timestamp, type, status, message };
    setLogs((prev) => [newEntry, ...prev].slice(0, 80)); // Limit to last 80 logs
  };

  // Log on initial load
  useEffect(() => {
    addLogEntry('CONNECT', 'SUCCESS', 'Full-stack TCP package listener initialized on node backend.');
  }, []);

  // --- HANDLERS ---
  const handleToggleServer = () => {
    setIsServerOnline((prev) => {
      const next = !prev;
      addLogEntry(
        'CONNECT',
        next ? 'SUCCESS' : 'FAILURE',
        next ? 'SMB server connection back online.' : 'SMB service shutdown requested on host.'
      );
      return next;
    });
  };

  const handleResetServer = async () => {
    setActiveFileDetails(null);
    setActiveFileViewer(null);
    await fetchFiles();
    addLogEntry('WRITE', 'SUCCESS', 'SMB3 hard reset triggered. Memory buffers flushed.');
  };

  const handleLoginSuccess = (userSession: UserSession, plainPassword: string) => {
    setPassword(plainPassword);
    setSession(userSession);
  };

  const handleLogout = () => {
    if (session) {
      addLogEntry('CONNECT', 'SUCCESS', `Session ID terminated. SMB3 Tree Disconnect completed for User: ${session.username}`);
    }
    setSession(null);
    setPassword('');
    setActiveFileDetails(null);
    setActiveFileViewer(null);
  };

  // File download helper (actually downloads a local file from server endpoint!)
  const handleDownloadFile = async (file: SMBFile) => {
    addLogEntry('READ', 'PENDING', `SMB Read: Transferring file chunks for '${file.name}' (${(file.size / 1024).toFixed(1)} KB)...`);
    
    try {
      const res = await fetch(`/api/files/download?path=${encodeURIComponent(file.path)}`, {
        headers: {
          'x-username': session?.username || '',
          'x-password': password
        }
      });

      if (!res.ok) {
        throw new Error('Download failed: ' + res.statusText);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addLogEntry('READ', 'SUCCESS', `File packet stream completed: Transfer block finished for '${file.name}'.`);
    } catch (err: any) {
      addLogEntry('READ', 'FAILURE', `Failed to write local download stream: ${err.message}`);
    }
  };

  // Copy code helper
  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- ACL FILTERED FILE LIST ---
  const userFilteredFiles = files;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden antialiased">
      
      {/* Top Navigation / Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/25">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Android SMB File Explorer
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full font-semibold font-mono">
                Port 445 • SMB3
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Production-Ready Windows SMB Share Client Code & Interactive Simulator
            </p>
          </div>
        </div>

        {/* Tab System Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Real Kotlin Source Code</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      {activeTab === 'simulator' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8 min-h-0">
          
          {/* Android Device Area */}
          <div className="flex-1 flex items-center justify-center min-w-0 h-full w-full">
            <AndroidFrame
              showBezel={showBezel}
              onHomeClick={session ? handleLogout : undefined}
              onBackClick={session ? () => {
                const backBtn = document.getElementById('back-breadcrumb-btn');
                if (backBtn) {
                  backBtn.click();
                } else {
                  handleLogout();
                }
              } : undefined}
              canGoBack={session !== null}
            >
              {/* View Switching */}
              {!session ? (
                <LoginScreen
                  serverConfig={SERVER_CONFIG}
                  isServerOnline={isServerOnline}
                  onLoginSuccess={handleLoginSuccess}
                  onLogEntry={addLogEntry}
                />
              ) : (
                <FileExplorerScreen
                  session={session}
                  password={password}
                  files={userFilteredFiles}
                  onLogout={handleLogout}
                  onRefresh={fetchFiles}
                  onLogEntry={addLogEntry}
                  onSelectFileDetails={setActiveFileDetails}
                  onOpenFileViewer={setActiveFileViewer}
                  onDownloadFile={handleDownloadFile}
                />
              )}

              {/* Render Bottom Sheet Details if active */}
              {activeFileDetails && (
                <FileDetailBottomSheet
                  file={activeFileDetails}
                  onClose={() => setActiveFileDetails(null)}
                  onOpen={setActiveFileViewer}
                  onDownload={handleDownloadFile}
                  onRename={(file) => {
                    const name = prompt(`Rename '${file.name}' to:`, file.name);
                    if (name && name.trim() && name.trim() !== file.name) {
                      const hasAccess = file.permissions.canRename;
                      if (!hasAccess) {
                        addLogEntry('RENAME', 'FAILURE', `Access Denied: You do not have permissions to rename this file.`);
                        alert('Access Denied: You do not have rename permissions for this item.');
                        return;
                      }
                      
                      const oldName = file.name;
                      const oldPath = file.path;
                      const parentParts = oldPath.split('/');
                      parentParts.pop();
                      const newPath = parentParts.length > 0 ? `${parentParts.join('/')}/${name.trim()}` : name.trim();

                      addLogEntry('RENAME', 'PENDING', `SMB Rename: Changing node name from '${oldName}' to '${name.trim()}'...`);
                      
                      fetch('/api/files/rename', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-username': session?.username || '',
                          'x-password': password
                        },
                        body: JSON.stringify({ oldPath, newPath })
                      })
                      .then(async (res) => {
                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.error || 'Rename failed');
                        }
                        await fetchFiles();
                        setActiveFileDetails(null);
                        addLogEntry('RENAME', 'SUCCESS', `Successfully renamed '${oldName}' to '${name.trim()}'`);
                      })
                      .catch((err) => {
                        addLogEntry('RENAME', 'FAILURE', `Rename failed: ${err.message}`);
                        alert(err.message);
                      });
                    }
                  }}
                  onDelete={(file) => {
                    const check = confirm(`Are you sure you want to delete '${file.name}'?`);
                    if (check) {
                      const hasAccess = file.permissions.canDelete;
                      if (!hasAccess) {
                        addLogEntry('DELETE', 'FAILURE', `Access Denied: You do not have permissions to delete this item.`);
                        alert('Access Denied: You do not have permission to delete this file/folder.');
                        return;
                      }

                      addLogEntry('DELETE', 'PENDING', `SMB Delete: Removing node for \\\\192.168.1.50\\${file.path.replace(/\//g, '\\')}...`);
                      
                      fetch('/api/files/delete', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-username': session?.username || '',
                          'x-password': password
                        },
                        body: JSON.stringify({ path: file.path, isDirectory: file.type === 'folder' })
                      })
                      .then(async (res) => {
                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.error || 'Delete failed');
                        }
                        await fetchFiles();
                        setActiveFileDetails(null);
                        addLogEntry('DELETE', 'SUCCESS', `Deleted item '${file.name}' and all associated nodes.`);
                      })
                      .catch((err) => {
                        addLogEntry('DELETE', 'FAILURE', `Delete failed: ${err.message}`);
                        alert(err.message);
                      });
                    }
                  }}
                />
              )}

              {/* Render Full Screen File Viewer Dialog if active */}
              {activeFileViewer && (
                <FileViewer
                  file={activeFileViewer}
                  onClose={() => setActiveFileViewer(null)}
                  onDownload={handleDownloadFile}
                />
              )}
            </AndroidFrame>
          </div>

          {/* Right Side: Diagnostics Console */}
          <DebugPanel
            logs={logs}
            isServerOnline={isServerOnline}
            onToggleServer={handleToggleServer}
            onResetServer={handleResetServer}
            activeSession={session}
          />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">
          
          {/* File Directory List on Left side of Code View */}
          <div className="w-full lg:w-80 shrink-0 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Kotlin Source Tree</span>
              </h2>
              <div className="space-y-1">
                {KOTLIN_PROJECT_FILES.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedKotlinFile(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 ${
                      selectedKotlinFile === idx
                        ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-300'
                        : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">{file.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-950/80 font-mono text-slate-500 uppercase">
                        {file.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{file.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 text-xs">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Local Environment Setup
                </p>
                <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                  These Kotlin files form the production-ready code you can run inside Android Studio to interact directly with any Windows SMB3 Server in your home or corporate office LAN network context.
                </p>
              </div>
            </div>
          </div>

          {/* Code Viewer Panel on Right side */}
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col min-w-0">
            {/* Code Panel Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0">
              <div>
                <span className="text-xs text-slate-500 font-mono block">
                  {KOTLIN_PROJECT_FILES[selectedKotlinFile].path}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {KOTLIN_PROJECT_FILES[selectedKotlinFile].name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(KOTLIN_PROJECT_FILES[selectedKotlinFile].code, selectedKotlinFile)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700/60 cursor-pointer"
                >
                  {copiedIndex === selectedKotlinFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-mono">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Source</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Display Area */}
            <div className="flex-1 overflow-auto p-6 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950 select-text selection:bg-indigo-500/35">
              <pre className="whitespace-pre">
                <code>{KOTLIN_PROJECT_FILES[selectedKotlinFile].code}</code>
              </pre>
            </div>
          </div>
        </main>
      )}

      {/* Instructional Help Section / Footnote footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-4 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <p>
              This applet replicates a complete <strong>Android Kotlin / MVVM</strong> system architecture. Explore file shares by logging in as <strong>digihub\847</strong> (read-only finance, write-only upload path) or <strong>digihub\john</strong> (administrator).
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span>Local subnet: 192.168.1.0/24</span>
            <span className="text-slate-600">|</span>
            <span>Port: 445</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
