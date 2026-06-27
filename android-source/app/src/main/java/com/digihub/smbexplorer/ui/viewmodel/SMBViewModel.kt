package com.digihub.smbexplorer.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.digihub.smbexplorer.data.model.SMBFileItem
import com.digihub.smbexplorer.data.repository.SMBRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.InputStream
import java.io.OutputStream

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

    fun navigateInto(item: SMBFileItem) {
        if (!item.isDirectory) return
        
        if (_currentShare.value.isEmpty()) {
            // If we are at root, the clicked item path is actually the Share Name
            loadDirectory(item.name, "")
        } else {
            loadDirectory(_currentShare.value, item.path)
        }
    }

    fun navigateBack() {
        if (_currentShare.value.isEmpty()) return // Already at root shares
        
        if (_currentPath.value.isEmpty()) {
            // Inside a share, but at the root level of it. Navigating back takes us to shares root!
            loadDirectory("", "")
        } else {
            // Nested folder. Pop last path element
            val parts = _currentPath.value.split("/")
            if (parts.size <= 1) {
                loadDirectory(_currentShare.value, "")
            } else {
                val parentPath = parts.dropLast(1).joinToString("/")
                loadDirectory(_currentShare.value, parentPath)
            }
        }
    }

    fun createFolder(name: String) {
        val share = _currentShare.value
        val path = _currentPath.value
        if (share.isEmpty()) return // Can't create folders at root share level

        viewModelScope.launch {
            val fullPath = if (path.isEmpty()) name else "$path/$name"
            repository.createDirectory(share, fullPath)
                .onSuccess {
                    loadDirectory(share, path) // refresh list
                }
                .onFailure {
                    // Handle failure or display message
                }
        }
    }

    fun renameItem(item: SMBFileItem, newName: String) {
        viewModelScope.launch {
            val parentPath = item.path.substringBeforeLast('/', "")
            val newPath = if (parentPath.isEmpty()) newName else "$parentPath/$newName"
            
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

    fun downloadFile(item: SMBFileItem, outputStream: OutputStream, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.downloadFile(item.shareName, item.path, outputStream)
                .onSuccess { onComplete(true) }
                .onFailure { onComplete(false) }
        }
    }

    fun uploadFile(fileName: String, inputStream: InputStream, onComplete: (Boolean) -> Unit) {
        val share = _currentShare.value
        val path = _currentPath.value
        if (share.isEmpty()) return

        viewModelScope.launch {
            val targetPath = if (path.isEmpty()) fileName else "$path/$fileName"
            repository.uploadFile(share, targetPath, inputStream)
                .onSuccess {
                    loadDirectory(share, path)
                    onComplete(true)
                }
                .onFailure {
                    onComplete(false)
                }
        }
    }

    fun logout() {
        repository.disconnect()
        _username.value = ""
        _currentShare.value = ""
        _currentPath.value = ""
        _loginState.value = LoginState.Idle
        _fileState.value = FileState.Idle
    }

    override fun onCleared() {
        super.onCleared()
        repository.disconnect()
    }
}
