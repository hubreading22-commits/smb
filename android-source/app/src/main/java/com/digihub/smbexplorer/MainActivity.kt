package com.digihub.smbexplorer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.digihub.smbexplorer.ui.screens.FileExplorerScreen
import com.digihub.smbexplorer.ui.screens.LoginScreen
import com.digihub.smbexplorer.ui.viewmodel.LoginState
import com.digihub.smbexplorer.ui.viewmodel.SMBViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: SMBViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val loginState by viewModel.loginState.collectAsState()
                    
                    if (loginState is LoginState.Success) {
                        FileExplorerScreen(viewModel = viewModel)
                    } else {
                        LoginScreen(viewModel = viewModel)
                    }
                }
            }
        }
    }
}
