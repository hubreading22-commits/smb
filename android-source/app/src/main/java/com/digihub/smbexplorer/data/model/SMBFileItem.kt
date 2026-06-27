package com.digihub.smbexplorer.data.model

import java.io.Serializable

/**
 * High-fidelity representation of a file or directory hosted on the SMB3 server.
 */
data class SMBFileItem(
    val name: String,
    val path: String, // Relative path inside the share, e.g., "Documents/report.txt"
    val shareName: String, // The parent SMB share name, e.g., "Public_Share"
    val isDirectory: Boolean,
    val size: Long, // Size in bytes
    val lastModified: Long, // Epoch timestamp in milliseconds
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
}
