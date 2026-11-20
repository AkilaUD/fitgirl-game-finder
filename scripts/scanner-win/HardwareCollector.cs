using System;
using System.Collections.Generic;
using System.Linq;
using System.Management;
using System.Text;
using System.Web.Script.Serialization;

internal static class HardwareCollector
{
    public static string CollectJson()
    {
        var report = new Dictionary<string, object>
        {
            { "schemaVersion", 1 },
            { "scanSource", "desktop" },
            { "timestamp", DateTime.UtcNow.ToString("o") },
            { "system", SysBlock() },
            { "cpu", CpuBlock() },
            { "ram", RamBlock() },
            { "gpus", GpuList() },
            { "drives", DriveList() },
            { "volumes", VolumeList() },
            { "os", OsBlock() },
            { "motherboard", BoardBlock() },
        };
        return new JavaScriptSerializer { MaxJsonLength = int.MaxValue }.Serialize(report);
    }

    static Dictionary<string, object> SysBlock()
    {
        var cs = First("Win32_ComputerSystem", "Manufacturer", "Model");
        return new Dictionary<string, object>
        {
            { "manufacturer", cs["Manufacturer"] },
            { "model", cs["Model"] },
        };
    }

    static Dictionary<string, object> CpuBlock()
    {
        var cpu = First("Win32_Processor", "Manufacturer", "Name", "Architecture", "NumberOfCores",
            "NumberOfLogicalProcessors", "MaxClockSpeed", "CurrentClockSpeed");
        return new Dictionary<string, object>
        {
            { "manufacturer", cpu["Manufacturer"] },
            { "model", cpu["Name"] },
            { "architecture", cpu["Architecture"] },
            { "physicalCores", cpu["NumberOfCores"] },
            { "logicalProcessors", cpu["NumberOfLogicalProcessors"] },
            { "maxClockMhz", cpu["MaxClockSpeed"] },
            { "currentClockMhz", cpu["CurrentClockSpeed"] },
        };
    }

    static Dictionary<string, object> RamBlock()
    {
        ulong total = 0;
        var mods = new List<Dictionary<string, object>>();
        using (var s = new ManagementObjectSearcher("SELECT Capacity, Manufacturer, Speed FROM Win32_PhysicalMemory"))
        {
            foreach (ManagementObject m in s.Get())
            {
                var cap = ToUlong(m["Capacity"]);
                total += cap;
                mods.Add(new Dictionary<string, object>
                {
                    { "capacityBytes", cap },
                    { "manufacturer", m["Manufacturer"] },
                    { "speedMhz", m["Speed"] },
                    { "memoryType", null },
                });
            }
        }
        return new Dictionary<string, object>
        {
            { "totalBytes", total },
            { "totalGB", total > 0 ? (object)Math.Round(total / 1073741824.0, 1) : null },
            { "modules", mods },
        };
    }

    static List<Dictionary<string, object>> GpuList()
    {
        var list = new List<Dictionary<string, object>>();
        using (var s = new ManagementObjectSearcher("SELECT Name, AdapterCompatibility, DriverVersion, AdapterRAM FROM Win32_VideoController"))
        {
            foreach (ManagementObject m in s.Get())
            {
                var name = (m["Name"] ?? "").ToString();
                if (string.IsNullOrWhiteSpace(name)) continue;
                var lower = name.ToLowerInvariant();
                if (lower.Contains("virtual") || lower.Contains("basic display") || lower.Contains("remote") || lower.Contains("mirror"))
                    continue;
                list.Add(new Dictionary<string, object>
                {
                    { "manufacturer", m["AdapterCompatibility"] },
                    { "model", name },
                    { "driverVersion", m["DriverVersion"] },
                    { "dedicatedVramBytes", m["AdapterRAM"] },
                    { "sharedVramBytes", null },
                });
            }
        }
        return list;
    }

    static List<Dictionary<string, object>> DriveList()
    {
        var list = new List<Dictionary<string, object>>();
        using (var s = new ManagementObjectSearcher("SELECT Model, Manufacturer, Size, InterfaceType FROM Win32_DiskDrive"))
        {
            foreach (ManagementObject m in s.Get())
            {
                list.Add(new Dictionary<string, object>
                {
                    { "model", m["Model"] },
                    { "manufacturer", m["Manufacturer"] },
                    { "capacityBytes", m["Size"] },
                    { "mediaType", null },
                    { "interfaceType", m["InterfaceType"] },
                });
            }
        }
        return list;
    }

    static List<Dictionary<string, object>> VolumeList()
    {
        var list = new List<Dictionary<string, object>>();
        using (var s = new ManagementObjectSearcher("SELECT DeviceID, VolumeName, Size, FreeSpace, FileSystem FROM Win32_LogicalDisk WHERE DriveType=3"))
        {
            foreach (ManagementObject m in s.Get())
            {
                var size = ToUlong(m["Size"]);
                var free = ToUlong(m["FreeSpace"]);
                ulong? used = size > 0 && free > 0 ? (ulong?)(size - free) : null;
                list.Add(new Dictionary<string, object>
                {
                    { "driveLetter", m["DeviceID"] },
                    { "label", m["VolumeName"] },
                    { "capacityBytes", size > 0 ? (object)size : null },
                    { "freeBytes", free > 0 ? (object)free : null },
                    { "usedBytes", used },
                    { "fileSystem", m["FileSystem"] },
                });
            }
        }
        return list;
    }

    static Dictionary<string, object> OsBlock()
    {
        var os = First("Win32_OperatingSystem", "Caption", "Version", "BuildNumber", "OSArchitecture");
        return new Dictionary<string, object>
        {
            { "name", os["Caption"] },
            { "version", os["Version"] },
            { "build", os["BuildNumber"] },
            { "architecture", os["OSArchitecture"] },
        };
    }

    static Dictionary<string, object> BoardBlock()
    {
        var board = First("Win32_BaseBoard", "Manufacturer", "Product");
        var bios = First("Win32_BIOS", "Manufacturer", "SMBIOSBIOSVersion");
        return new Dictionary<string, object>
        {
            { "manufacturer", board["Manufacturer"] },
            { "product", board["Product"] },
            { "biosManufacturer", bios["Manufacturer"] },
            { "biosVersion", bios["SMBIOSBIOSVersion"] },
        };
    }

    static Dictionary<string, object> First(string wmi, params string[] props)
    {
        var dict = new Dictionary<string, object>();
        foreach (var p in props) dict[p] = null;
        using (var s = new ManagementObjectSearcher("SELECT " + string.Join(",", props) + " FROM " + wmi))
        {
            foreach (ManagementObject m in s.Get())
            {
                foreach (var p in props) dict[p] = m[p];
                break;
            }
        }
        return dict;
    }

    static ulong ToUlong(object v)
    {
        if (v == null) return 0;
        try { return Convert.ToUInt64(v); } catch { return 0; }
    }

    public static string FormatSummary(string reportJson)
    {
        try
        {
            var ser = new JavaScriptSerializer();
            var d = ser.DeserializeObject(reportJson) as Dictionary<string, object>;
            if (d == null) return "";
            var sb = new StringBuilder();
            var cpu = d.ContainsKey("cpu") ? d["cpu"] as Dictionary<string, object> : null;
            var ram = d.ContainsKey("ram") ? d["ram"] as Dictionary<string, object> : null;
            var gpus = d.ContainsKey("gpus") ? d["gpus"] as object[] : null;
            if (cpu != null) sb.AppendLine("CPU: " + (cpu.ContainsKey("model") ? cpu["model"] : "—"));
            if (gpus != null && gpus.Length > 0)
            {
                var g0 = gpus[0] as Dictionary<string, object>;
                sb.AppendLine("GPU: " + (g0 != null && g0.ContainsKey("model") ? g0["model"] : "—"));
            }
            if (ram != null) sb.AppendLine("RAM: " + (ram.ContainsKey("totalGB") ? ram["totalGB"] + " GB" : "—"));
            return sb.ToString().Trim();
        }
        catch { return ""; }
    }
}