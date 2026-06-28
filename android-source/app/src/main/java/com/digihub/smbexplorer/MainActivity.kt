package com.digihub.smbexplorer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.digihub.smbexplorer.ui.screens.FileExplorerScreen
import com.digihub.smbexplorer.ui.screens.LoginScreen
import com.digihub.smbexplorer.ui.viewmodel.LoginState
import com.digihub.smbexplorer.ui.viewmodel.SMBViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: SMBViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val customDarkColorScheme = darkColorScheme(
                primary = Color(0xFF007ACC),
                background = Color(0xFF121212),
                surface = Color(0xFF1E1E1E),
                onBackground = Color(0xFFE3E3E3),
                onSurface = Color(0xFFE3E3E3)
            )

            MaterialTheme(colorScheme = customDarkColorScheme) {
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
