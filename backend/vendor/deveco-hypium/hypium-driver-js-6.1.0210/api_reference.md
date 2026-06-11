# 目录
- [UiDriver](#uidriver)
  - [属性](#属性)
  - [连接管理接口](#连接管理接口)
    - [UiDriver.connect](#uidriverconnect)
    - [UiDriver.disconnect](#uidriverdisconnect)
  - [设备基础信息查询接口](#设备基础信息查询接口)
    - [UiDriver.getDeviceType](#uidrivergetdevicetype)
    - [UiDriver.getDeviceSn](#uidrivergetdevicesn)
    - [UiDriver.getDeviceModel](#uidrivergetdevicemodel)
    - [UiDriver.getApiLevel](#uidrivergetapilevel)
    - [UiDriver.getSystemVersion](#uidrivergetsystemversion)
  - [控件获取接口](#控件获取接口)
    - [UiDriver.findComponent](#uidriverfindcomponent)
    - [UiDriver.findComponents](#uidriverfindcomponents)
    - [UiDriver.dumpLayout](#uidriverdumplayout)
    - [UiDriver.screenCap](#driverscreencap)
  - [窗口获取接口](#窗口获取接口)
    - [UiDriver.findWindow](#uidriverfindwindow)
  - [界面操作接口](#界面操作接口)
    - [UiDriver.click](#uidriverclick)
    - [UiDriver.doubleClick](#uidriverdoubleclick)
    - [UiDriver.longClick](#uidriverlongclick)
    - [UiDriver.clickAt](#uidriverclickat)
    - [UiDriver.doubleClickAt](#uidriverdoubleclickat)
    - [UiDriver.longClickAt](#uidriverlongclickat)
    - [UiDriver.swipe](#uidriverswipe)
    - [UiDriver.swipeHold](#uidriverswipehold)
    - [UiDriver.pressHome](#uidriverpresshome)
    - [UiDriver.pressBack](#uidriverpressback)
    - [UiDriver.pressKey](#uidriverpresskey)
    - [UiDriver.triggerCombinationKey](#uidrivertriggercombinationkey)
    - [UiDriver.injectMultiPointerAction](#uidriverinjectmultipointeraction)
    - [UiDriver.waitForIdle](#uidriverwaitforidle)
    - [UiDriver.wait](#uidriverwait)
    - [UiDriver.drag](#uidriverdrag)
    - [UiDriver.fling](#uidriverfling)
    - [UiDriver.mouseClick](#uidrivermouseclick)
    - [UiDriver.mouseDoubleClick](#uidrivermousedoubleclick)
    - [UiDriver.mouseLongClick](#uidrivermouselongclick)
    - [UiDriver.mouseScroll](#uidrivermousescroll)
    - [UiDriver.mouseDrag](#uidrivermousedrag)
    - [UiDriver.mouseMoveTo](#uidrivermousemoveto)
    - [UiDriver.mouseMoveWithTrack](#uidrivermousemovewithtrack)
    - [UiDriver.crownRotate](#uidrivercrownrotate)
  - [文本输入接口](#文本输入接口)
    - [UiDriver.inputText](#uidriverinputtext)
  - [设备命令执行接口](#设备命令执行接口)
    - [UiDriver.shell](#uidrivershell)
    - [UiDriver.hdc](#uidriverhdc)
  - [应用管理接口](#应用管理接口)
    - [UiDriver.startApp](#uidriverstartapp)
    - [UiDriver.hasApp](#uidriverhasapp)
    - [UiDriver.stopApp](#uidriverstopapp)
    - [UiDriver.installApp](#uidriverinstallapp)
    - [UiDriver.uninstallApp](#uidriveruninstallapp)
    - [UiDriver.clearAppData](#uidriverclearappdata)
    - [UiDriver.clearAppCache](#uidriverclearappcache)
    - [UiDriver.getAppInfo](#uidrivergetappinfo)
    - [UiDriver.isAppRunning](#uidriverisapprunning)
    - [UiDriver.currentApp](#uidrivercurrentapp)
    - [UiDriver.getInstalledApps](#uidrivergetinstalledapps)
  - [文件操作接口](#文件操作接口)
    - [UiDriver.pushFile](#uidriverpushfile)
    - [UiDriver.pullFile](#uidriverpullfile)
    - [UiDriver.hasFile](#uidriverhasfile)
    - [UiDriver.rmFile](#uidriverrmfile)
  - [屏幕显示管理接口](#屏幕显示管理接口)
    - [UiDriver.wakeUpDisplay](#uidriverwakeupdisplay)
    - [UiDriver.closeDisplay](#uidriverclosedisplay)
    - [UiDriver.isDisplayOn](#uidriverisdisplayon)
    - [UiDriver.isDisplayLocked](#uidriverisdisplaylocked)
    - [UiDriver.unlock](#uidriverunlock)
    - [UiDriver.getDisplayRotation](#uidrivergetdisplayrotation)
    - [UiDriver.setDisplayRotation](#uidriversetdisplayrotation)
    - [UiDriver.setDislayAutoRotate](#uidriversetdislayautorotate)
    - [UiDriver.setSleepTime](#uidriversetsleeptime)
    - [UiDriver.restoreSleepTime](#uidriverrestoresleeptime)
    - [UiDriver.getDisplaySize](#uidrivergetdisplaysize)
    - [UiDriver.Screen.startRecordingScreen](#uidriverscreenstartrecordingscreen)
    - [UiDriver.Screen.stopRecordingScreen](#uidriverscreenstoprecordingscreen)
  - [设备日志接口](#设备日志接口)
    - [UiDriver.hilog.startHilog](#uidriverhilogstarthilog)
    - [UiDriver.hilog.stopHilog](#uidriverhilogstophilog)
    - [UiDriver.hilog.getLogs](#uidriverhiloggetlogs)
    - [UiDriver.hilog.setHilogListener](#uidriverhilogsethiloglistener)
    - [UiDriver.hilog.removeHilogListener](#uidriverhilogremovehiloglistener)
- [UiComponent](#uicomponent)
  - [控件操作接口](#控件操作接口)
    - [UiComponent.click](#uicomponentclick)
    - [UiComponent.doubleClick](#uicomponentdoubleclick)
    - [UiComponent.longClick](#uicomponentlongclick)
    - [UiComponent.inputText](#uicomponentinputtext)
    - [UiComponent.clearText](#uicomponentcleartext)
    - [UiComponent.scrollSearch](#uicomponentscrollsearch)
    - [UiComponent.scrollToTop](#uicomponentscrolltotop)
    - [UiComponent.scrollToBottom](#uicomponentscrolltobottom)
    - [UiComponent.dragTo](#uicomponentdragto)
    - [UiComponent.pinchOut](#uicomponentpinchout)
    - [UiComponent.pinchIn](#uicomponentpinchin)
  - [控件属性查询接口](#控件属性查询接口)
    - [UiComponent.getBounds](#uicomponentgetbounds)
    - [UiComponent.getBoundsCenter](#uicomponentgetboundscenter)
    - [UiComponent.getText](#uicomponentgettext)
    - [UiComponent.getType](#uicomponentgettype)
    - [UiComponent.getKey](#uicomponentgetkey)
    - [UiComponent.getId](#uicomponentgetid)
    - [UiComponent.isClickable](#uicomponentisclickable)
    - [UiComponent.isScrollable](#uicomponentisscrollable)
    - [UiComponent.isLongClickable](#uicomponentislongclickable)
    - [UiComponent.isCheckable](#uicomponentischeckable)
    - [UiComponent.isEnabled](#uicomponentisenabled)
    - [UiComponent.isFocused](#uicomponentisfocused)
    - [UiComponent.isSelected](#uicomponentisselected)
    - [UiComponent.isChecked](#uicomponentischecked)
    - [UiComponent.getHint](#uicomponentgethint)
    - [UiComponent.exist](#uicomponentexist)
- [UiWindow](#uiwindow)
  - [窗口操作接口](#窗口操作接口)
    - [UiWindow.resize](#uiwindowresize)
    - [UiWindow.maximize](#uiwindowmaximize)
    - [UiWindow.minimize](#uiwindowminimize)
    - [UiWindow.close](#uiwindowclose)
    - [UiWindow.focus](#uiwindowfocus)
    - [UiWindow.moveTo](#uiwindowmoveto)
  - [窗口属性查询接口](#窗口属性查询接口)
    - [UiWindow.getBundleName](#uiwindowgetbundlename)
    - [UiWindow.getBounds](#uiwindowgetbounds)
    - [UiWindow.isFocused](#uiwindowisfocused)
    - [UiWindow.isActive](#uiwindowisactive)
    - [UiWindow.exist](#uiwindowexist)
- [BY](#by)
  - [控件选择器接口](#控件选择器接口)
    - [BY.text](#bytext)
    - [BY.key](#bykey)
    - [BY.id](#byid)
    - [BY.type](#bytype)
    - [BY.isAfter](#byisafter)
    - [BY.isBefore](#byisbefore)
    - [BY.within](#bywithin)
    - [BY.inWindow](#byinwindow)
    - [BY.checkable](#bycheckable)
    - [BY.clickable](#byclickable)
    - [BY.longClickable](#bylongclickable)
    - [BY.scrollable](#byscrollable)
    - [BY.enabled](#byenabled)
    - [BY.focused](#byfocused)
    - [BY.selected](#byselected)
    - [BY.checked](#bychecked)
    - [BY.hint](#byhint)
    - [BY.xpath](#byxpath)
- [数据类接口](#数据类接口)
  - [DriverCaps](#drivercaps)
  - [WindowFilter](#windowfilter)
  - [PointerMatrix](#pointermatrix)
    - [setPoint](#setpoint)
  - [PointAction](#pointaction)
    - [down](#down)
    - [move_to](#move_to)
    - [hold](#hold)
    - [toPointerMatrix](#topointermatrix)
    - [mergeMultiPointAction](#mergemultipointaction)
  - [KeyCode](#keycode)
  - [Rect](#rect)
  - [Point](#point)
  - [DeviceType](#devicetype)
  - [MatchPattern](#matchpattern)
  - [MouseButton](#mousebutton)
  - [DisplayRotation](#displayrotation)
  - [ResizeDirection](#resizedirection)
  - [LogEntry](#logentry)

# UiDriver

提供鸿蒙设备连接能力以及执行自动化操作的核心能力接口。

**导入方式**
```js
import { UiDriver } from "hypium-driver";
```

## 属性
| **属性名** | **类型**       | **功能描述**       |
|---------|--------------|----------------|
| config  | DriverConfig | 配置UiDriver相关属性 |
## 连接管理接口

### UiDriver.connect

**功能描述**

创建自动化驱动对象，连接到指定设备

**接口定义**

static async connect(opts: DriverCaps)

**参数说明**

| 参数名      | 类型     | 说明         | 必选                          |
|----------|--------|------------|-----------------------------|
| opts | DriverCaps | 连接相关配置参数 | 是, DriverCaps中具体选项内容可以为空 |


**返回值说明**

返回UiDriver对象

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function main() {
  let driver = await UiDriver.connect( {} );
  await driver.disconnect();
}
```

### UiDriver.disconnect

**功能描述**

断开连接，清理相关资源

**接口定义**

async disconnect()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function main() {
  let driver = await UiDriver.connect( {} );
  await driver.disconnect();
}
```

## 设备基础信息查询接口

### UiDriver.getDeviceType

**功能描述**

读取设备类型

**接口定义**

async getDeviceType()

**参数说明**

无

**返回值说明**

string，返回设备类型字符串

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let getDeviceType = await driver.getDeviceType()
}
```

### UiDriver.getDeviceSn

**功能描述**

读取设备SN号

**接口定义**

getDeviceSn()

**参数说明**

无

**返回值说明**

string，返回对应的设备SN

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let getDeviceSn = driver.getDeviceSn()
}
```

### UiDriver.getDeviceModel

**功能描述**

读取设备型号

**接口定义**

async getDeviceModel()

**参数说明**

无

**返回值说明**

string，返回对应的设备型号

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let getDeviceModel = await driver.getDeviceModel()
}
```

### UiDriver.getApiLevel

**功能描述**

读取设备API级别

**接口定义**

async getApiLevel()

**参数说明**

无

**返回值说明**

string，返回对应的设备的API等级

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let getApiLevel = await driver.getApiLevel()
}
```

### UiDriver.getSystemVersion

**功能描述**

读取设备系统版本号

**接口定义**

async getSystemVersion()

**参数说明**

无

**返回值说明**

string，返回设备软件版本号

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let getSystemVersion = await driver.getSystemVersion()
}
```

## 控件获取接口

### UiDriver.findComponent

**功能描述**

查找满足条件的第一个控件， 返回控件对象。该接口始终会返回一个UiComponent对象，UiComponent对象会在实际使用的时候才会触发查找，如果没有找到则抛出异常，可以通过UiComponent.exist()判断控件是否实际存在。

**实现说明**

通过uitest的api实现控件查找

**接口定义**

findComponent(by: By, timeout?: number)

**参数说明**

| 参数名称    | 参数类型   | 参数说明           | 必选                                         |
|---------|--------|----------------|--------------------------------------------|
| by      | By     | By选择器对象，指定查找条件 | 是                                          |
| timeout | number | 控件查找的超时时间，单位毫秒 | 否，默认为DriverConfig配置项中设置的implicitWaitTime时间 |


**返回值说明**

返回UiComponent对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let findComponent = driver.findComponent(BY.text("蓝牙"));
}
```

### UiDriver.findComponents

**功能描述**

查找满足条件的所有控件对象

**接口定义**

async findComponents(by: By)

**参数说明**

| 参数名称 | 参数类型 | 说明     | 必选 |
|------|------|--------|----|
| by   | By   | By控件类型 | 是  |

**返回值说明**

返回UiComponent对象数组

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponents = await driver.findComponents(BY.type("Text"));
}
```

### UiDriver.dumpLayout

**功能描述**

获取当前页面的控件树文件

**接口定义**

async dumpLayout(file_path: string)

**参数说明**

| 参数名称      | 参数类型   | 参数说明             |
|-----------|--------|------------------|
| file_path | string | 获取页面layout文件保存路径 |

**返回值说明**

控件树文件路径

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let dumpLayout = await driver.dumpLayout("layout.json");
}
```

### UiDriver.screenCap

**功能描述**

获取屏幕截图文件

**接口定义**

async screenCap(file_path: string)

**参数说明**

| 参数名称      | 参数类型   | 说明                                | 必选 |
|-----------|--------|-----------------------------------|----|
| file_path | string | 截图保存的路径，支持png和jpeg格式，支持png和jpeg格式 | 是  |

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.screenCap("test.jpeg");
  await driver.screenCap("test.png");
}
```

## 窗口获取接口

### UiDriver.findWindow

**功能描述**

查找窗口

**接口定义**

findWindow(filter: WindowFilter)

**参数说明**

| 参数名称   | 参数类型         | 说明               | 必选 |
|--------|--------------|------------------|----|
| filter | WindowFilter | 输入WindowFilter对象 | 是  |

**返回值说明**

UiWindow对象

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let findWindow = driver.findWindow({ bundleName: "com.huawei.hmos.settings" });
}
```

## 界面操作接口

### UiDriver.click

**功能描述**

点击指定坐标位置

**接口定义**

async click(x: number, y: number)

**参数说明**

| **参数名** | **类型** | **说明**  | **必选** |
|---------|--------|---------|--------|
| x       | number | 点击位置x坐标 | 是      |
| y       | number | 点击位置y坐标 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.click(469, 1425);
}
```

### UiDriver.doubleClick

**功能描述**

双击指定坐标位置

**接口定义**

async doubleClick(x: number, y:number)

**参数说明**

| **参数名** | **类型** | **说明**   | **必选** |
|---------|--------|----------|--------|
| x       | number | 点击位置的x坐标 | 是      |
| y       | number | 点击位置的y坐标 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.doubleClick(469, 1425)
}
```

### UiDriver.longClick

**功能描述**

长按指定坐标位置

**接口定义**

async longClick(x: number, y: number)

**参数说明**

| **参数名** | **类型** | **说明**   | **必选** |
|---------|--------|----------|--------|
| x       | number | 点击位置的x坐标 | 是      |
| y       | number | 点击位置的y坐标 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.longClick(155, 2267)
}
```

### UiDriver.clickAt
**功能描述**

点击指定坐标位置

**接口定义**

async clickAt(point: Point)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| point | Point | 点击坐标   | 是       |

**返回值说明**

无

**使用示例**

```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.clickAt(new Point(300, 600));
}
```

### UiDriver.doubleClickAt
**功能描述**

双击指定坐标位置

**接口定义**

async doubleClickAt(point: Point)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| point | Point | 点击坐标   | 是       |

**返回值说明**

无

**使用示例**

```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.doubleClickAt(new Point(300, 600));
}
```

### UiDriver.longClickAt
**功能描述**

长按指定坐标位置

**接口定义**

async longClickAt(point: Point , duration?: number)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| point | Point | 点击坐标   | 是       |
| duration | number | 持续时长，单位毫秒   | 是       |

**返回值说明**

无

**使用示例**
```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.longClickAt(new Point(300, 600), 1500);
}
```

### UiDriver.swipe

**功能描述**

模拟滑动操作

**接口定义**

async swipe(start_x: number, start_y: number, end_x: number, end_y:number, speed?: number)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| start_x | number | 滑动起始位置x坐标   | 是       |
| start_y | number | 滑动起始位置y坐标   | 是       |
| end_x   | number | 滑动结束位置x坐标   | 是       |
| end_y   | number | 滑动结束位置y坐标   | 是       |
| speed   | number | 滑动速度，单位像素/秒 | 否，默认600 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.swipe(519, 2450, 516, 1556, 3000)
}
```

### UiDriver.swipeHold

**功能描述**

模拟滑动操作，在结束位置停顿。可模拟拖滑(避免列表惯性滚动)或者触发部分滑动后需要保持一段时间后抬手的手势。

**接口定义**

async swipeHold(startX: number, startY: number, endX: number, endY:number, speed: number = 600, hold_time: number = 300)

**参数说明**

| **参数名**   | **类型** | **说明**      | **必选**    |
|-----------|--------|-------------|-----------|
| start_x   | number | 滑动起始位置x坐标   | 是         |
| start_y   | number | 滑动起始位置y坐标   | 是         |
| end_x     | number | 滑动结束位置x坐标   | 是         |
| end_y     | number | 滑动结束位置y坐标   | 是         |
| speed     | number | 滑动速度，单位像素/秒 | 否，默认600   |
| hold_time | number | 滑动结束位置保持的时间 | 否，默认300毫秒 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  // 滑动后停顿
  await driver.swipeHold(1000, 1500, 1000, 1500, 5000, 1000)
}
```

### UiDriver.pressHome

**功能描述**

模拟按下Home键返回桌面

**接口定义**

async pressHome()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.pressHome()
}
```

### UiDriver.pressBack

**功能描述**

模拟按下Back键返回桌面

**接口定义**

async pressBack()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.pressBack()
}
```

### UiDriver.pressKey

**功能描述**

模拟单个按键操作

**接口定义**

async pressKey(keycode: KeyCode)

**参数说明**

| **参数名** | **类型**  | **说明**                 | **必选** |
|---------|---------|------------------------|--------|
| keycode | KeyCode | 键盘码，支持的键盘码参考KeyCode常量类 | 是      |


**返回值说明**

无

**使用示例**
```js
import { KeyCode, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.pressKey(KeyCode.BACK)
}
```

### UiDriver.triggerCombinationKey

**功能描述**

模拟组合键按键操作

**接口定义**

async triggerCombineKeys(...keys: KeyCode[])

**参数说明**

| **参数名** | **类型**  | **说明**                | **必选** |
|---------|---------|-----------------------|--------|
| keys    | KeyCode | 可变参数，支持传入2个到3个KeyCode | 是      |

**返回值说明**

无

**使用示例**
```js
import { KeyCode, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.triggerCombineKeys(KeyCode.VOLUME_DOWN, KeyCode.POWER)
}
```

### UiDriver.injectMultiPointerAction

**功能描述**

模拟注入单指或者多指自定义操作

**接口定义**

async injectMultiPointerAction(action: PointerMatrix | PointAction, speed: number = 600)

**参数说明**

| **参数名** | **类型**                     | **说明**                  | **必选**  |
|---------|----------------------------|-------------------------|---------|
| action  | PointerMatrix或者PointAction | 表示单个或者多个手指移动路径的对象       | 是       |
| speed   | number                     | action中操作为指定时间时，默认的滑动速度 | 否，默认600 |

**返回值说明**

无

**使用示例**
```js
// 单指操作
let action = new PointAction()
  .down(new Point(500, 500))
  .move_to(new Point(500, 200))
  .hold()
  .move_to(new Point(500, 600))
await driver.injectMultiPointerAction(action)

// 多指操作
let action1 = new PointAction()
  .down(new Point(500, 300))
  .move_to(new Point(500, 1100))
let action2 = new PointAction()
  .down(new Point(500, 1600))
  .move_to(new Point(500, 1150))
let combine_action = PointAction.mergeMultiPointAction([action1, action2])
await driver.injectMultiPointerAction(combine_action)
```

### UiDriver.waitForIdle

**功能描述**

等待界面稳定

**接口定义**

async waitForIdle(idleTime: number, timeout: number)

**参数说明**

| **参数名**   | **类型** | **说明**                                   | **必选** |
|-----------|--------|------------------------------------------|--------|
| idle_time | number | 界面稳定状态判断的时间间隔，界面超过idle_time没有刷新事件就判断为已稳定 | 是      |
| timeout   | number | 如果界面始终处于不稳定状态时该接口超时返回的时间，单位毫秒            | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.waitForIdle(3000, 3000)
}
```

### UiDriver.wait

**功能描述**

等待指定时间

**接口定义**

async wait(duration: number)

**参数说明**

| **参数名**  | **类型** | **说明**    | **必选** |
|----------|--------|-----------|--------|
| duration | number | 等待时间，单位毫秒 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.wait(3000)
}
```

###  UiDriver.drag

**功能描述**

在屏幕上进行拖动操作

**接口定义**

async drag(startX: number, startY: number, endX: number, endY: number, speed: number)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| startX  | number | 起始位置x坐标     | 是       |
| startY  | number | 起始位置y坐标     | 是       |
| endX    | number | 结束位置x坐标     | 是       |
| endY    | number | 结束位置y坐标     | 是       |
| speed   | number | 滑动速度，单位像素/秒 | 否，默认600 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.drag(944, 1948, 134, 1930, 300)
}
```

###  UiDriver.fling

**功能描述**

执行抛滑操作(滑动速度更快)

**接口定义**

async fling(startX: number, startY: number, endX: number, endY: number, stepLen: number, speed: number)

**参数说明**

| **参数名** | **类型** | **说明**           | **必选** |
|---------|--------|------------------|--------|
| startX  | number | 起始位置x坐标          | 是      |
| startY  | number | 起始位置y坐标          | 是      |
| endX    | number | 结束位置x坐标          | 是      |
| endY    | number | 结束位置y坐标          | 是      |
| stepLen | number | 滑动步长，两次注事件点之间的间隔 | 是      |
| speed   | number | 滑动速度，单位像素/秒      | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.fling(944, 1948, 134, 1930, 50, 300)
}
```

### UiDriver.mouseClick

**功能描述**

鼠标点击指定位置

**接口定义**

async mouseClick(point: Point, btn: MouseButton, key1?: KeyCode, key2?: KeyCode)

**参数说明**

| **参数名** | **类型**      | **说明**  | **必选** |
|---------|-------------|---------|--------|
| point   | Point       | 点击位置    | 是      |
| btn     | MouseButton | 点击的鼠标按钮 | 是      |
| key1    | KeyCode     | 组合键1    | 否      |
| key2    | KeyCode     | 组合键2    | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, MouseButton, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseClick(new Point(300, 600), MouseButton.MOUSE_BUTTON_LEFT)
}
```

### UiDriver.mouseDoubleClick

**功能描述**

鼠标双击指定位置

**接口定义**

async mouseDoubleClick(point: Point, btn: MouseButton, key1?: KeyCode, key2?: KeyCode)

**参数说明**

| **参数名** | **类型**      | **说明**  | **必选** |
|---------|-------------|---------|--------|
| point   | Point       | 点击位置    | 是      |
| btn     | MouseButton | 点击的鼠标按钮 | 是      |
| key1    | KeyCode     | 组合键1    | 否      |
| key2    | KeyCode     | 组合键2    | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, MouseButton, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseDoubleClick(new Point(300, 600), MouseButton.MOUSE_BUTTON_LEFT)
}
```

### UiDriver.mouseLongClick

**功能描述**

鼠标长按指定位置

**接口定义**

async mouseLongClick(point: Point, btn: MouseButton, key1?: KeyCode, key2?: KeyCode)

**参数说明**

| **参数名** | **类型**      | **说明**  | **必选** |
|---------|-------------|---------|--------|
| point   | Point       | 点击位置    | 是      |
| btn     | MouseButton | 点击的鼠标按钮 | 是      |
| key1    | KeyCode     | 组合键1    | 否      |
| key2    | KeyCode     | 组合键2    | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, MouseButton, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseLongClick(new Point(300, 600), MouseButton.MOUSE_BUTTON_LEFT)
}
```

### UiDriver.mouseScroll

**功能描述**

滚动鼠标滚轮

**接口定义**

async mouseScroll(point: Point, distance: number, key1?: KeyCode, key2?: KeyCode)

**参数说明**

| **参数名**  | **类型**  | **说明**                           | **必选** |
|----------|---------|----------------------------------|--------|
| point    | Point   | 设置滚轮滚动前光标位置                      | 是      |
| distance | number  | 滚动距离，单位为鼠标滚轮格树，正数表示向前滚动，负数表示向后滚动 | 是      |
| key1     | KeyCode | 组合键1                             | 否      |
| key2     | KeyCode | 组合键2                             | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, MouseButton, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseScroll(new Point(300, 600), MouseButton.MOUSE_BUTTON_MIDDLE)
}
```

### UiDriver.mouseDrag

**功能描述**

按住鼠标左键拖拽

**接口定义**

async mouseDrag(start: Point, end: Point, speed: number = 600)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选** |
|---------|--------|-------------|--------|
| start   | Point  | 拖拽起始位置      | 是      |
| end     | Point  | 拖拽结束位置      | 是      |
| speed   | number | 拖拽速度，单位像素/秒 | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseDrag(new Point(300, 600), new Point(600, 600))
}
```

### UiDriver.mouseMoveTo

**功能描述**

设置鼠标光标到到指定坐标位置，无移动轨迹

**接口定义**

async mouseMoveTo(point: Point)

**参数说明**

| **参数名** | **类型** | **说明** | **必选** |
|---------|--------|--------|--------|
| point   | Point  | 目标位置坐标 | 是      |

**返回值说明**

无

**使用示例**
```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseMoveTo(new Point(300, 600))
}
```

### UiDriver.mouseMoveWithTrack

**功能描述**

光标从指定起始位置移动到结束位置，包含轨迹

**接口定义**

async mouseMoveWithTrack(start: Point, end: Point, speed: number = 600)

**参数说明**

| **参数名** | **类型** | **说明**      | **必选** |
|---------|--------|-------------|--------|
| start   | Point  | 起始位置坐标      | 是      |
| end     | Point  | 结束位置坐标      | 是      |
| speed   | number | 移动速度，单位像素/秒 | 否      |

**返回值说明**

无

**使用示例**
```js
import { Point, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.mouseMoveWithTrack(new Point(300, 600), new Point(600, 600), 100)
}
```

### UiDriver.crownRotate

**功能描述**

光标从指定起始位置移动到结束位置，包含轨迹

**接口定义**

async crownRotate(d: number, speed?: number)

**参数说明**

| **参数名** | **类型** | **说明**                  | **必选** |
|---------|--------|-------------------------|--------|
| d       | number | 表冠旋转的步数，正数顺时针旋转，负数逆时针旋转 | 是      |
| speed   | number | 旋转速度，范围[1, 500]，默认为20   | 否      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  // 顺时针旋转10步
  await driver.crownRotate(10)
  // 逆时针旋转10步
  await driver.crownRotate(-10)
  // 顺时针旋转10步, 设置速度为100
  await driver.crownRotate(10, 100)
}
```

## 文本输入接口

### UiDriver.inputText

**功能描述**

向指定的坐标位置输入文本

**接口定义**

async inputText(point: Point, text: string, mode?: InputTextMode)

**参数说明**

| **参数名** | **类型**        | **说明**                                                                                                                                                                             | **必选** |
|---------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| point   | Point         | 文本输入目标位置的坐标                                                                                                                                                                        | 是      |
| text    | string        | 输入的文本内容                                                                                                                                                                            | 是      |
| mode    | InputTextMode | 配置文本输入模式<br/>默认模式如下: <br/>1. 默认清空指定的控件中的文本后再执行输入 <br/>2. 英文字符长度<200时，逐个输入，超过200时，通过剪切板粘贴一次输入 <br/>3. 中文文本通过剪切板粘贴一次输入 <br/>通过该参数可以配置: <br/>1. 追加输入 <br/>2. 不考虑文本长度直接使用剪切板输入或者逐个文字输入 | 否      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const comp = driver.findComponent(BY.id("mms_input_textarea_id"));
  await comp.inputText("11");
  await driver.wait(1500);
  // 追加输入内容
  await comp.inputText("22", { addition: true });
  await driver.wait(1500);
  // 使用剪切板粘贴模式输入内容
  await comp.inputText("33", { paste: true });
}
```

## 设备命令执行接口

### UiDriver.shell

**功能描述**

在设备shell中执行命令

**接口定义**

async shell(cmd: string, timeout?: number)

**参数说明**

| **参数名** | **类型** | **说明**                     | **必选** |
|---------|--------|----------------------------|--------|
| cmd     | string | 需要执行的shell命令               | 是      |
| timeout | number | 超时时间，单位毫秒，默认值300 * 1000毫秒 | 否      |

**返回值说明**

string，返回命令的回显结果

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.shell("ls -l")
}
```

### UiDriver.hdc

**功能描述**

执行hdc命令

**接口定义**

async hdc(cmd: string, timeout?: number)

**参数说明**

| **参数名** | **类型** | **说明**                    | **必选** |
|---------|--------|---------------------------|--------|
| cmd     | string | 需要执行的shell命令              | 是      |
| timeout | number | 超时时间，单位毫秒，默认值120 * 1000毫秒 | 否      |

**返回值说明**

string，返回命令的回显结果

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.hdc("--version")
}
```

## 应用管理接口

### UiDriver.startApp

**功能描述**

启动指定app

**接口定义**

async startApp(bundle_name: string, ability_name: string)

**参数说明**

| **参数名**      | **类型** | **说明**         | **必选** |
|--------------|--------|----------------|--------|
| bundle_name  | string | 需要启动的应用包名      | 是      |
| ability_name | string | 需要启动的ability名称 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility")
}
```

### UiDriver.hasApp

**功能描述**

判断app是否安装

**接口定义**

async hasApp(bundle_name: string)

**参数说明**

| 参数名         | 类型     | 说明   | 必选 |
|-------------|--------|------|----|
| bundle_name | string | 应用包名 | 是  |

**返回值说明**

boolean，返回是否存在指定app

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.hasApp("com.huawei.hmos.settings")
}
```

### UiDriver.stopApp

**功能描述**

停止app运行

**接口定义**

async stopApp(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.stopApp("com.huawei.hmos.settings")
}
```

### UiDriver.installApp

**功能描述**

安装app，支持hap包安装

**接口定义**

async installApp(file_path: string, extra_options?: str)

**参数说明**

| **参数名**       | **类型** | **说明**       | **必选** |
|---------------|--------|--------------|--------|
| file_path     | string | app安装包路径     | 是      |
| extra_options | string | 传递给bm命令的额外参数 | 否，默认为空 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.installApp("./meituan.hap")
}
```

### UiDriver.uninstallApp

**功能描述**

卸载App

**接口定义**

async uninstallApp(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.uninstallApp("com.sankuai.hmeituan")
}
```

### UiDriver.clearAppData

**功能描述**

清除App数据

**接口定义**

async clearAppData(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.clearAppData("com.sankuai.hmeituan")
}
```

### UiDriver.clearAppCache

**功能描述**

清理应用缓存

**接口定义**

async clearAppCache(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.clearAppCache("com.sankuai.hmeituan")
}
```

### UiDriver.getAppInfo

**功能描述**

获取app的详细安装信息

**接口定义**

async getAppInfo(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

json对象，包含App的各类信息，包含应用的abiltiy，权限，版本号等信息。详细信息请参考bm dump -n命令输出。

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.getAppInfo("com.huawei.hmos.settings")
}
```

### UiDriver.isAppRunning

**功能描述**

查询app进程是否在运行

**接口定义**

async isAppRunning(bundle_name: string)

**参数说明**

| **参数名**     | **类型** | **说明** | **必选** |
|-------------|--------|--------|--------|
| bundle_name | string | 应用包名   | 是      |

**返回值说明**

boolean，返回应用进程是否在运行

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.isAppRunning("com.huawei.hmos.settings")
}
```

### UiDriver.currentApp

**功能描述**

获取前台获焦的应用的bundle_name和ability_name

**接口定义**

async currentApp()

**参数说明**

无

**返回值说明**

string，返回格式为bundle_name/ability_name

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.currentApp()
  console.log(ret)
}
```

### UiDriver.getInstalledApps

**功能描述**

获取所有已安装的应用包名

**接口定义**

async getInstalledApps()

**参数说明**

无

**返回值说明**

字符串数组，返回所有已经安装的应用bundle_name

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.getInstalledApps()
  console.log(ret)
}
```
## 文件操作接口

### UiDriver.pushFile

**功能描述**

推送文件到设备中

**接口定义**

async pushFile(local_file_path: string, remote_file_path: string, timeout?: number)

**参数说明**

| **参数名**          | **类型** | **说明**    | **必选**            |
|------------------|--------|-----------|-------------------|
| local_file_path  | string | 本地文件路径    | 是                 |
| remote_file_path | string | 远程文件路径    | 是                 |
| timeout          | number | 超时时间，单位毫秒 | 否，默认120 * 1000毫秒 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.pushFile("./test.json", "/data/local/tmp")
}
```

### UiDriver.pullFile

**功能描述**

从设备中拉取文件

**接口定义**

async pullFile(remote_path: str, local_path: str, timeout?: number)

**参数说明**

| **参数名**          | **类型** | **说明**    | **必选**            |
|------------------|--------|-----------|-------------------|
| local_file_path  | string | 本地文件路径    | 是                 |
| remote_file_path | string | 远程文件路径    | 是                 |
| timeout          | number | 超时时间，单位毫秒 | 否，默认120 * 1000毫秒 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.pullFile("/data/local/tmp", "./test/", 3000)
}
```

### UiDriver.hasFile

**功能描述**

判断文件或者目录是否存在

**接口定义**

async hasFile(file_path: string)

**参数说明**

| **参数名**   | **类型** | **说明**       | **必选** |
|-----------|--------|--------------|--------|
| file_path | string | 需要检查的设备端文件路径 | 是      |

**返回值说明**

boolean，表示文件/目录是否存在

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.hasFile("/data/local/tmp/test.json")
}
```

### UiDriver.rmFile

**功能描述**

删除文件或者目录

**接口定义**

async rmFile(file_path: string)

**参数说明**

| **参数名**   | **类型** | **说明**    | **必选** |
|-----------|--------|-----------|--------|
| file_path | string | 需要删除的文件路径 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.rmFile("/data/local/tmp/test.json")
}
```

## 屏幕显示管理接口

### UiDriver.wakeUpDisplay

**功能描述**

点亮设备屏幕

**接口定义**

async wakeUpDisplay()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.wakeUpDisplay()
}
```

### UiDriver.closeDisplay

**功能描述**

关闭设备屏幕

**实现说明**

通过power-shell suspend命令实现

**接口定义**

async closeDisplay()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.closeDisplay()
}
```

### UiDriver.isDisplayOn

**功能描述**

查询设备屏幕是否点亮

**接口定义**

async bool isDisplayOn()

**参数说明**

无

**返回值说明**

boolean，返回屏幕是否点亮

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.isDisplayOn()
}
```

### UiDriver.isDisplayLocked

**功能描述**

查询设备是否锁屏

**接口定义**

async isDisplayLocked()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.isDisplayLocked()
}
```

### UiDriver.unlock

**功能描述**

点亮屏幕并解锁，仅手机/pad支持无密码解锁

**接口定义**

async unlock()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.unlock()
}
```

### UiDriver.getDisplayRotation

**功能描述**

获取屏幕旋转方向

**接口定义**

async getDisplayRotation()

**参数说明**

无

**返回值说明**

DisplayRotation枚举值，表示屏幕旋转方向

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.getDisplayRotation()
}
```

### UiDriver.setDisplayRotation

**功能描述**

设置屏幕旋转方向

**接口定义**

async setDisplayRotation(direction: DisplayRotation)

**参数说明**

| **参数名**   | **类型**          | **说明** | **必选** |
|-----------|-----------------|--------|--------|
| direction | DisplayRotation | 屏幕旋转方向 | 否      |

**返回值说明**

无

**使用示例**
```js
import { DisplayRotation, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.setDisplayRotation(DisplayRotation.ROTATION_90)
  await driver.setDisplayRotation(DisplayRotation.ROTATION_0)
  await driver.setDisplayRotation(DisplayRotation.ROTATION_270)
  await driver.setDisplayRotation(DisplayRotation.ROTATION_180)
}
```

### UiDriver.setDislayAutoRotate

**功能描述**

设置屏幕自动旋转开关

**接口定义**

async setDislayAutoRotate(enable: boolean)

**参数说明**

| **参数名** | **类型**  | **说明**      | **必选** |
|---------|---------|-------------|--------|
| enable  | boolean | 开启/关闭屏幕自动旋转 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.setDisplayAutoRotate(true)
  await driver.setDisplayAutoRotate(false)
}
```

### UiDriver.setSleepTime

**功能描述**

设置屏幕熄屏时间

**接口定义**

async setSleepTime(sleep_time: number)

**参数说明**

| **参数名**    | **类型** | **说明**      | **必选** |
|------------|--------|-------------|--------|
| sleep_time | number | 屏幕熄屏时间，单位ms | 否      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.setSleepTime(60000)
}
```

### UiDriver.restoreSleepTime

**功能描述**

恢复默认熄屏时间

**接口定义**

async restoreSleepTime()

**参数说明**

| **参数名**    | **类型** | **说明**      | **必选** |
|------------|--------|-------------|--------|
| sleep_time | number | 屏幕熄屏时间，单位ms | 否      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.restoreSleepTime()
}
```

###  UiDriver.getDisplaySize

**功能描述**

获取屏幕分辨率

**接口定义**

async getDisplaySize()

**参数说明**

无

**返回值说明**

Point对象，Point对象的x属性表示屏幕宽度，y属性表示屏幕高度

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let ret = await driver.getDisplaySize()
}
```

###	UiDriver.Screen.startRecordingScreen
**功能描述**

开始录屏

**接口定义**

async startRecordingScreen()

**参数说明**

无

**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.Screen.startRecordingScreen();
  await sleep(5000);
  await driver.Screen.stopRecordingScreen({ 'mp4': 'D:\\mytest.mp4' });
}
```

###	UiDriver.Screen.stopRecordingScreen
**功能描述**

结束录屏

**接口定义**

async stopRecordingScreen(options = { mp4: '' })

**参数说明**

| **参数名** | **类型** | **说明**      | **必选**  |
|---------|--------|-------------|---------|
| mp4 | string | 录屏视频文件保存路径   | 否       |

**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.Screen.startRecordingScreen();
  await sleep(5000);
  await driver.Screen.stopRecordingScreen({ 'mp4': 'D:\\mytest.mp4' });
}
```

##	设备日志接口

###	UiDriver.hilog.startHilog
**功能描述**

开始抓取设备日志

**接口定义**

async startHilog(opts = { })

**参数说明**

无

**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const listener = function (entry) {
    console.log(`${JSON.stringify(entry)}`);
  };
  await driver.hilog.startHilog();
  driver.hilog.setHilogListener(listener);
  await sleep(3000);
  const result = driver.hilog.getLogs();
  console.log(`log length: ${result.length}`);
  driver.hilog.removeHilogListener(listener);
  await driver.hilog.stopHilog();
}
```

###	UiDriver.hilog.stopHilog
**功能描述**

停止抓取设备日志

**接口定义**

async stopHilog()

**参数说明**

无

**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const listener = function (entry) {
    console.log(`${JSON.stringify(entry)}`);
  };
  await driver.hilog.startHilog();
  driver.hilog.setHilogListener(listener);
  await sleep(3000);
  const result = driver.hilog.getLogs();
  console.log(`log length: ${result.length}`);
  driver.hilog.removeHilogListener(listener);
  await driver.hilog.stopHilog();
}
```

###	UiDriver.hilog.getLogs
**功能描述**

获取设备日志

**接口定义**

getLogs()

**参数说明**

无

**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const listener = function (entry) {
    console.log(`${JSON.stringify(entry)}`);
  };
  await driver.hilog.startHilog();
  driver.hilog.setHilogListener(listener);
  await sleep(3000);
  const result = driver.hilog.getLogs();
  console.log(`log length: ${result.length}`);
  driver.hilog.removeHilogListener(listener);
  await driver.hilog.stopHilog();
}
```

###	UiDriver.hilog.setHilogListener
**功能描述**

设置日志监听器

**接口定义**

setHilogListener(listener)

**参数说明**

| **参数名** | **类型** | **说明**      | **示例**  |**必选**  |
|---------|--------|-------------|---------|---------|
| listener | Function | 处理日志记录   | const listener = function(entry: LogEntry){}; |是 |


**返回值说明**

无

**使用示例**

```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const listener = function (entry) {
    console.log(`${JSON.stringify(entry)}`);
  };
  await driver.hilog.startHilog();
  driver.hilog.setHilogListener(listener);
  await sleep(3000);
  const result = driver.hilog.getLogs();
  console.log(`log length: ${result.length}`);
  driver.hilog.removeHilogListener(listener);
  await driver.hilog.stopHilog();
}
```

###	UiDriver.hilog.removeHilogListener
**功能描述**

移除在setHilogListener接口设置的日志监听器

**接口定义**

removeHilogListener(listener)

**参数说明**

| **参数名** | **类型** | **说明**      | **示例**  |**必选**  |
|---------|--------|-------------|---------|---------|
| listener | Function | 处理日志记录   | const listener = function(entry: LogEntry){}; |是 |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const listener = function (entry) {
    console.log(`${JSON.stringify(entry)}`);
  };
  await driver.hilog.startHilog();
  driver.hilog.setHilogListener(listener);
  await sleep(3000);
  const result = driver.hilog.getLogs();
  console.log(`log length: ${result.length}`);
  driver.hilog.removeHilogListener(listener);
  await driver.hilog.stopHilog();
}
```

# UiComponent

表示界面控件对象，提供界面元素属性查询和操作能力。

**导入方式**

```js
import { UiComponent } from "hypium-driver";
```

## 控件操作接口

### UiComponent.click

**功能描述**

点击控件

**接口定义**

async click()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  await driver.findComponent(BY.text("蓝牙")).click();
}
```

### UiComponent.doubleClick

**功能描述**

双击控件

**接口定义**

doubleClick()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  await driver.findComponent(BY.text("蓝牙")).doubleClick();
}
```

### UiComponent.longClick

**功能描述**

长按控件

**接口定义**

async longClick()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.findComponent(BY.id("AppIcon_Image_com.ohos.contacts_normal")).longClick();
}
```

### UiComponent.inputText

**功能描述**

向控件中输入文本，输入前清除已有的内容

**接口定义**

async inputText(text: string, mode?: InputTextMode)

**参数说明**

| **参数名** | **类型**        | **说明**                                                                                                                                                                                  | **必选** |
|---------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| text    | string        | 输入的文本内容                                                                                                                                                                                 | 是      |
| mode    | InputTextMode | 文本输入模式，可以指定追加输入或者使用剪切板粘贴输入<br>默认模式如下:<br>1. 默认清空指定的控件中的文本后再执行输入<br>2. 英文字符长度<200时，逐个输入，超过200时，通过剪切板粘贴一次输入<br>3. 中文文本通过剪切板粘贴一次输入<br>通过该参数可以配置:<br>1. 追加输入<br>2. 不考虑文本长度直接使用剪切板输入或者逐个文字输入 | 否      |

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  const comp = driver.findComponent(BY.id("mms_input_textarea_id"));
  await comp.inputText("11");
  await driver.wait(1500);
  // 追加输入内容
  await comp.inputText("22", { addition: true });
  await driver.wait(1500);
  // 使用剪切板粘贴模式输入内容
  await comp.inputText("33", { paste: true });
}
```

### UiComponent.clearText

**功能描述**

清除控件中输入的内容

**接口定义**

async clearText()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.findComponent(BY.type("SearchField")).clearText()
}
```

### UiComponent.scrollSearch

**功能描述**

在指定的控件中滚动搜索控件，需要调用方保证控件为可滚动控件

**接口定义**

scrollSearch(by: By)

**参数说明**

| 参数名称 | 参数类型 | 说明     | 必选 |
|------|------|--------|----|
| by   | By   | 控件查找条件 | 是  |

**返回值说明**

UiComponent对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let scroll_component = driver.findComponent(BY.type("ListItemGroup").isBefore(BY.type("ScrollBar")))
  let ret = scroll_component.scrollSearch(BY.text("声音和振动"))
}
```

### UiComponent.scrollToTop

**功能描述**

将当前滚动列表控件滚动到顶部，需要调用方保证控件为可滚动控件

**接口定义**

async scrollToTop()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponent = driver.findComponent(BY.type("ListItemGroup").isBefore(BY.type("ScrollBar")))
  await findComponent.scrollToTop()
}
```

### UiComponent.scrollToBottom

**功能描述**

将当前滚动列表控件滚动到底部，需要调用方保证控件本身是可滚动控件

**接口定义**

scrollToBottom()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponent = driver.findComponent(BY.type("ListItemGroup").isBefore(BY.type("ScrollBar")))
  await findComponent.scrollToBottom()
}
```

### UiComponent.dragTo

**功能描述**

将该控件拖拽到目标控件位置

**接口定义**

async dragTo(target: UiComponent)

**参数说明**

| 参数名称   | 参数类型        | 说明          | 必选 |
|--------|-------------|-------------|----|
| target | UiComponent | 拖拽结束位置的控件对象 | 是  |

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponent1 = driver.findComponent(BY.key("AppIcon_Image_com.huawei.hmsapp.appgalleryMainAbilityentry0_undefined"))
  console.log(findComponent1)
  let findComponent2 = driver.findComponent(BY.id("AppIcon_Image_com.huawei.hmos.settingscom.huawei.hmos.settings.MainAbilityphone_settings0_undefined"))
  await findComponent1.dragTo(findComponent2)
}
```

### UiComponent.pinchOut

**功能描述**

对该控件进行双指放大操作

**接口定义**

async pinchOut(scale: number)

**参数说明**

| 参数名称       | 参数类型   | 说明             | 必选 |
|------------|--------|----------------|----|
| scale      | number | 放大幅度，取值范围在1~2 | 是  |
| 值越大放大的幅度越大 |        |                |    |

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponent = driver.findComponent(BY.type("Image"))
  await findComponent.pinchOut(1.5)
}
```

### UiComponent.pinchIn

**功能描述**

对该控件进行双指缩小操作

**接口定义**

async pinchIn(scale: number)

**参数说明**

| 参数名称       | 参数类型   | 说明             | 必选 |
|------------|--------|----------------|----|
| scale      | number | 缩小幅度，取值范围在0~1 | 是  |
| 值越小缩小的幅度越大 |        |                |    |

**返回值说明**

无

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let findComponent = driver.findComponent(BY.type("Image"))
  await findComponent.pinchIn(0.5)
}
```

## 控件属性查询接口

### UiComponent.getBounds

**功能描述**

获取控件的矩形边框位置

**接口定义**

async getBounds()

**参数说明**

无

**返回值说明**

Rect对象，表示控件在屏幕上的矩形区域位置

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getBounds();
}
```

### UiComponent.getBoundsCenter

**功能描述**

获取控件中心位置坐标

**接口定义**

async getBoundsCenter()

**参数说明**

无

**返回值说明**

Point对象，表示控件坐标

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getBoundsCenter();
}
```

### UiComponent.getText

**功能描述**

获取控件text属性

**接口定义**

async getText()

**参数说明**

无

**返回值说明**

string，控件text属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getText();
}
```

### UiComponent.getType

**功能描述**

获取控件type属性

**接口定义**

async getType()

**参数说明**

无

**返回值说明**

string，控件type属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getType();
}
```

### UiComponent.getKey

**功能描述**

获取控件key属性

**接口定义**

async getKey()

**参数说明**

无

**返回值说明**

string，控件key属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getKey();
}
```

### UiComponent.getId

**功能描述**

获取控件的id

**接口定义**

async getId()

**参数说明**

无

**返回值说明**

string，控件id属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.getId();
}
```

### UiComponent.isClickable

**功能描述**

获取控件clickable属性

**接口定义**

async isClickable()

**参数说明**

无

**返回值说明**

boolean，返回控件clickable属性

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isClickable();
}
```

### UiComponent.isScrollable

**功能描述**

查询控件scrollable属性

**接口定义**

async isScrollable()

**参数说明**

无

**返回值说明**

boolean，返回控件scrollable属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isScrollable();
}
```

### UiComponent.isLongClickable

**功能描述**

查询控件longClickable属性

**接口定义**

async isLongClickable()

**参数说明**

无

**返回值说明**

boolean，返回控件longClickable属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isLongClickable();
}
```

### UiComponent.isCheckable

**功能描述**

查询控件checkable属性

**接口定义**

async isCheckable()

**参数说明**

无

**返回值说明**

boolean，返回控件checkable属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isCheckable();
}
```

### UiComponent.isEnabled

**功能描述**

查询控件enabled属性

**接口定义**

async isEnabled()

**参数说明**

无

**返回值说明**

boolean，返回控件enabled属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isEnabled();
}
```

### UiComponent.isFocused

**功能描述**

查询控件focused属性

**接口定义**

async isFocused()

**参数说明**

无

**返回值说明**

boolean，返回控件focused属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isFocused();
}
```

### UiComponent.isSelected

**功能描述**

查询控件selected属性

**接口定义**

async isSelected()

**参数说明**

无

**返回值说明**

boolean，返回控件selected属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isSelected();
}
```

### UiComponent.isChecked

**功能描述**

查询控件checked属性

**接口定义**

async isChecked()

**参数说明**

无

**返回值说明**

boolean，返回控件checked属性值

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.isChecked();
}
```

### UiComponent.getHint

**功能描述**

查询控件hint属性

**接口定义**

async getHint()

**参数说明**

无

**返回值说明**

string，返回控件hint属性值

**使用示例**
```js
import { BY, UiDriver, MatchPattern } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.hint("搜索设置项", MatchPattern.REGEXP_ICASE));
  let hint: string = await component.getHint();
}
```

### UiComponent.exist

**功能描述**

查询控件是否在当前界面存在

**接口定义**

async exist()

**参数说明**

无

**返回值说明**

boolean，返回控件是否在界面上存在

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  await driver.startApp("com.huawei.hmos.settings", "com.huawei.hmos.settings.MainAbility");
  let comp = driver.findComponent(BY.type("SearchField").isAfter(BY.type("Search")));
  let ret = await comp.exist();
}
```

# UiWindow

表示界面窗口对象，提供界面窗口属性查询和操作能力。

**导入方式**

```js
import { UiWindow } from "hypium-driver";
```

## 窗口操作接口


### UiWindow.resize

**功能描述**

调整窗口大小

**接口定义**

async resize(width: number, height: number, resize_direction:ResizeDirection)

**参数说明**

| **参数名**          | **类型**          | **说明**    | **必选** |
|------------------|-----------------|-----------|--------|
| width            | number          | 目标窗口宽度    | 是      |
| height           | number          | 目标窗口高度    | 是      |
| resize_direction | ResizeDirection | 调整窗口时拖拽位置 | 是      |

**返回值说明**

无

**使用示例**
```js
import { ResizeDirection, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ bundleName: "com.huawei.hmos.settings" })
  await window_test_app.resize(100, 100, ResizeDirection.UP)
}
```

### UiWindow.maximize

**功能描述**

窗口最大化

**接口定义**

async maximize()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  await window_test_app.maximize()
}
```

### UiWindow.minimize

**功能描述**

窗口最小化

**接口定义**

async minimize()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  await window_test_app.minimize()
}
```

### UiWindow.close

**功能描述**

关闭窗口

**接口定义**

async close()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  await window_test_app.close()
}
```

### UiWindow.focus

**功能描述**

使窗口获焦

**接口定义**

async focus()

**参数说明**

无

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  await window_test_app.focus()
}
```

### UiWindow.moveTo

**功能描述**

移动窗口到指定坐标位置

**接口定义**

async moveTo(x: number, y: number)

**参数说明**

| **参数名** | **类型** | **说明**   | **必选** |
|---------|--------|----------|--------|
| x       | number | 目标位置的x坐标 | 是      |
| y       | number | 目标位置的y坐标 | 是      |

**返回值说明**

无

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  await window_test_app.moveTo(200, 200)
}
```

## 窗口属性查询接口


### UiWindow.getBundleName

**功能描述**

获取窗口对应的应用包名

**接口定义**

async getBundleName()

**参数说明**

无

**返回值说明**

string类型，返回窗口所属的应用包名

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  let ret = await window_test_app.getBundleName()
}
```

### UiWindow.getBounds

**功能描述**

获取窗口所在的区域位置

**接口定义**

async getBounds()

**参数说明**

无

**返回值说明**

Rect类型，返回窗口的矩形区域位置

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  let ret = await window_test_app.getBounds()
}
```

### UiWindow.isFocused

**功能描述**

判断窗口是否获焦

**接口定义**

async isFocused()

**参数说明**

无

**返回值说明**

boolean，返回窗口是否为获焦

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  let ret = await window_test_app.isFocused()
}
```

### UiWindow.isActive

**功能描述**

判断窗口是否为活动窗口

**接口定义**

async isActive()

**参数说明**

无

**返回值说明**

boolean，返回窗口是否为活动窗口

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  let ret = await window_test_app.isActive()
  console.log(ret)
}
```

### UiWindow.exist

**功能描述**

查询窗口是否在当前界面存在

**接口定义**

async exist()

**参数说明**

无

**返回值说明**

boolean，返回窗口是否在当前界面存在

**使用示例**
```js
import { UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let window_test_app = driver.findWindow({ "bundleName": "com.huawei.hmos.settings" })
  let ret = await window_test_app.exist()
}
```

# BY

表示控件查找条件，提供查找控件时描述控件属性或者位置特征的接口。

该类不支持直接创建对象使用，请导入静态对象BY使用。

**导入方式**

  ```js
import { BY } from "hypium-driver"
  ```

## 控件选择器接口


### BY.text

**功能描述**

指定目标控件的text属性

**接口定义**

text(text: string, matchPattern: MatchPattern = MatchPattern.EQUALS)

**参数说明**

| **参数名称**     | **参数类型**     | **说明**                | **必选**   |
|--------------|--------------|-----------------------|----------|
| text         | string       | 期望查找的控件的text值         | 是        |
| matchPattern | MatchPattern | 匹配模式，支持MatchPattern类型 | 否，默认全等匹配 |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.text("蓝牙"))
}
```

### BY.key

**功能描述**

指定目标控件的key属性(id和key表示同一个属性)

**接口定义**

key(key: string)

**参数说明**

| 参数名称 | 参数类型   | 说明         | 必选 |
|------|--------|------------|----|
| key  | string | 期望查找的控件id值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.key("bluetooth_entry.title"))
}
```

### BY.id

**功能描述**

指定目标控件的id属性(id和key表示同一个属性)

**接口定义**

id(id: string)

**参数说明**

| 参数名称 | 参数类型   | 说明         | 必选 |
|------|--------|------------|----|
| key  | string | 期望查找的控件id值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.id("bluetooth_entry.title"))
}
```

### BY.type

**功能描述**

指定目标控件的type属性

**接口定义**

type(value: string)

**参数说明**

| 参数名称  | 参数类型   | 说明        | 必选 |
|-------|--------|-----------|----|
| value | string | 期望查找的控件类型 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.type("Text"))
}
```

### BY.isAfter

**功能描述**

指定目标控件位于另一个控件通过By选择的控件之后(控件树深度优先先序遍历顺序)。

**接口定义**

isAfter(anchor: By)

**参数说明**

| 参数名称   | 参数类型 | 说明            | 必选 |
|--------|------|---------------|----|
| anchor | By   | 通过By指定的另外一个控件 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.checkable(false).isAfter(BY.text("移动网络")))
}
```

### BY.isBefore

**功能描述**

指定目标控件位于另一个控件之前(控件树深度优先先序遍历顺序)。

**接口定义**

isBefore(anchor: By)

**参数说明**

| 参数名称   | 参数类型 | 说明            | 必选 |
|--------|------|---------------|----|
| anchor | By   | 通过By指定的另外一个控件 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.checkable(false).isBefore(BY.key("wifi_entry.title")))
}
```

### BY.within

**功能描述**

指定目标控件位于另外一个控件中(目标控件为另外一个控件的子孙节点)

**接口定义**

within(anchor: By)

**参数说明**

| 参数名称   | 参数类型 | 说明            | 必选 |
|--------|------|---------------|----|
| anchor | By   | 通过By指定的另外一个控件 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.text("蓝牙").within(BY.type("ROW")))
}
```

### BY.inWindow

**功能描述**

指定目标控件位置指定包名的窗口中

**接口定义**

inWindow(bundle_name: string)

**参数说明**

| 参数名称        | 参数类型   | 说明   | 必选 |
|-------------|--------|------|----|
| bundle_name | string | 应用包名 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.text('WLAN').inWindow('com.huawei.hmos.settings'))
}
```

### BY.checkable

**功能描述**

指定目标控件的checkable属性

**接口定义**

checkable(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明                | 必选 |
|-------|---------|-------------------|----|
| value | boolean | 目标控件的checkable属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.checkable(false))
}
```

### BY.clickable

**功能描述**

指定目标控件的clickable属性

**接口定义**

clickable(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明                | 必选 |
|-------|---------|-------------------|----|
| value | boolean | 目标控件的clickable属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.clickable(false))
}
```

### BY.longClickable

**功能描述**

指定目标控件的longClickable属性

**接口定义**

longClickable(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明                    | 必选 |
|-------|---------|-----------------------|----|
| value | boolean | 目标控件的longClickable属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.longClickable(false))
}
```

### BY.scrollable

**功能描述**

指定目标控件的scrollable属性

**接口定义**

scrollable(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明                 | 必选 |
|-------|---------|--------------------|----|
| value | boolean | 目标控件的scrollable属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.scrollable(false))
}
```

### BY.enabled

**功能描述**

指定目标控件的enabled属性

**接口定义**

enabled(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明              | 必选 |
|-------|---------|-----------------|----|
| value | boolean | 目标控件的enabled属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.enabled(false))
}
```

### BY.focused

**功能描述**

指定目标控件的focused属性

**接口定义**

focused(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明              | 必选 |
|-------|---------|-----------------|----|
| value | boolean | 目标控件的focused属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.focused(true))
}
```

### BY.selected

**功能描述**

指定目标控件的selected属性

**接口定义**

selected(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明               | 必选 |
|-------|---------|------------------|----|
| value | boolean | 目标控件的selected属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.selected(false))
}
```

### BY.checked

**功能描述**

指定目标控件的checked属性

**接口定义**

checked(value: boolean)

**参数说明**

| 参数名称  | 参数类型    | 说明              | 必选 |
|-------|---------|-----------------|----|
| value | boolean | 目标控件的checked属性值 | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.checked(false))
}
```

### BY.hint

**功能描述**

指定目标控件的hint属性

**接口定义**

hint(value: string, matchPattern?: MatchPattern)

**参数说明**

| 参数名称         | 参数类型         | 说明           | 必选       |
|--------------|--------------|--------------|----------|
| value        | string       | 目标控件的hint属性值 | 是        |
| matchPattern | MatchPattern | 匹配模式         | 否，默认全等匹配 |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = driver.findComponent(BY.hint("搜索设置项"));
}
```
### BY.xpath

**功能描述**

指定目标控件的xpath，仅支持在driver.findComponentByXpath中使用

**接口定义**

xpath(value: string)

**参数说明**

| 参数名称  | 参数类型   | 说明         | 必选 |
|-------|--------|------------|----|
| value | string | 目标控件的xpath | 是  |

**返回值说明**

返回By对象

**使用示例**
```js
import { BY, UiDriver } from "hypium-driver";

async function example(driver: UiDriver) {
  let component = await driver.findComponentByXpath(BY.xpath("//\*\[@hint='搜索设置项'\]"));
}
```
# 数据类接口

## DriverCaps

**功能描述**

UiDriver创建相关配置。

**导入说明**

interface无需导入。

**属性说明**

| **名称**         | **类型**     |  **说明**      |
|------------|--------|-----------|
| deviceSn   | string | 设备序列号, 不设置默认连接hdc list targets的第一个设备 |
| udid       | string | 设备序列号，同deviceSn，优先使用udid |
| hdcHost    | string | hdc server的IP地址， 默认使用本地hdc server |
| hdcPort    | number | hdc server的端口号， 默认使用8710 |
| hdcExecTimeout | number | hdc命令执行超时时间，默认为10000毫秒 |
| rpcTimeout  | number | 和设备端通信的超时时间，默认为300000毫秒 |
| implicitWaitTime   | number | 查找控件时默认等待控件出现的超时时间，默认4000毫秒 |
| samplingTime | number | 事件注入的间隔，默认15毫秒 |

**返回值说明**

无

**使用示例**
```js
await UiDriver.connect({ deviceSn: 'sn' })
```

## WindowFilter

**功能描述**

在UiDriver.findWindow接口中使用，根据包名等属性过滤查找的窗口。

**导入说明**

interface无需导入

**属性说明**

| **属性名称**   | **属性类型** | **说明**    |
|------------|----------|-----------|
| title      | string   | 窗口标题      |
| bundleName | string   | 窗口对应的应用包名 |
| focused    | string   | 窗口是否获焦    |
| actived    | string   | 窗口是否为活动窗口 |

**返回值说明**

无

**使用示例**
```js
let window_name = await driver.findWindow({ focused: true }).getBundleName()
```

## Point

**功能描述**

表示一个坐标点

**导入说明**

```js
import { Point } from 'hypium-driver'

```
**属性说明**

| **属性名称** | **属性类型** | **说明** |
|----------|----------|--------|
| x        | number   | x坐标值   |
| y        | number   | y坐标值   |

**使用示例**
```js
let p = new Point(300, 600);
```

## PointerMatrix

**功能描述**

描述多指自定义操作的操作点位

**导入说明**
```js
import { PointerMatrix } from 'hypium-driver'

```
### setPoint

**功能描述**

设置一个操作的坐标点

**接口定义**

setPoint(fingerIndex: number, stepIndex: number, point: Point, delay?:number)

**参数说明**

| **参数名**     | **类型**          | **说明**     | **必选** |
|-------------|-----------------|------------|--------|
| fingerIndex | number          | 手指序号，从0开始  | 是      |
| stepIndex   | number          | 事件点序号，从0开始 | 是      |
| point       | Point           | 事件点坐标      | 是      |
| delay       | number          | 该点停顿的时间    | 否      |
| 单位毫秒        | 默认根据最终注入的速度进行计算 |            |        |

**返回值说明**

无

**使用示例**
```js
let p = new PointerMatrix(3, 2);
p.setPoint(0, 0, new Point(300, 600));
p.setPoint(0, 1, new Point(300, 700));
p.setPoint(0, 2, new Point(300, 800));
p.setPoint(1, 0, new Point(600, 600));
p.setPoint(1, 1, new Point(600, 700));
p.setPoint(1, 2, new Point(600, 800));
await driver.injectMultiPointerAction(p, 3000);
```

## PointAction

**功能描述**

描述单指自定义操作路径

**导入说明**

```js
import { PointAction } from 'hypium-driver'
```

### down

**功能描述**

描述手指按下操作

**接口定义**

down(pos: Point, duration: number = 50)

**参数说明**

| **参数名**  | **类型** | **说明**      | **必选** |
|----------|--------|-------------|--------|
| pos      | Point  | 按下的位置       | 是      |
| duration | number | 操作持续时长，单位毫秒 | 否，默认50 |

**返回值说明**

PointAction，返回对象自身，支持链式调用

**使用示例**
```js
// 多指操作
let action1 = new PointAction()
  .down(new Point(500, 300))
  .move_to(new Point(500, 1100))
let action2 = new PointAction()
  .down(new Point(500, 1600))
  .move_to(new Point(500, 1150))
let combine_action = PointAction.mergeMultiPointAction([action1, action2])
await driver.injectMultiPointerAction(combine_action)
// 单指操作
let action = new PointAction()
  .down(new Point(500, 500))
  .move_to(new Point(500, 200))
  .hold()
  .move_to(new Point(500, 600))
await driver.injectMultiPointerAction(action)
```

### move_to

**功能描述**

描述手指移动操作

**接口定义**

move_to(pos: Point, duration: number = 500)

**参数说明**

| **参数名**  | **类型** | **说明**      | **必选**  |
|----------|--------|-------------|---------|
| pos      | Point  | 按下的位置       | 是       |
| duration | number | 操作持续时长，单位毫秒 | 否，默认500 |

**返回值说明**

PointAction，返回对象自身，支持链式调用

**使用示例**
```js
// 单指操作
let action = new PointAction()
  .down(new Point(500, 500))
  .move_to(new Point(500, 200))
  .hold()
  .move_to(new Point(500, 600))
await driver.injectMultiPointerAction(action)
```
### hold

**功能描述**

描述手指停顿操作

**接口定义**

hold(duration: number = 1000)

**参数说明**

| **参数名**  | **类型** | **说明**    | **必选**   |
|----------|--------|-----------|----------|
| duration | number  | 停顿时长，单位毫秒 | 否，默认1000 |

**返回值说明**

PointAction，返回对象自身，支持链式调用

**使用示例**
```js
// 单指操作
let action = new PointAction()
  .down(new Point(500, 500))
  .move_to(new Point(500, 200))
  .hold()
  .move_to(new Point(500, 600))
await driver.injectMultiPointerAction(action)
```
### toPointerMatrix

**功能描述**

将当前数据对象转换为PointerMatrix对象

**接口定义**

toPointerMatrix()

**参数说明**

**无**

**返回值说明**

PointerMatrix对象

**使用示例**
```js
let action = new PointAction()
  .down(new Point(500, 500))
  .move_to(new Point(500, 200))
  .hold()
  .move_to(new Point(500, 600))
action.toPointerMatrix()
```
### mergeMultiPointAction

**功能描述**

将多个单指操作的PointAction合并为描述完整操作的PointMatrix

**接口定义**

static mergeMultiPointAction(point_action_list: PointAction[])

**参数说明**

| **参数名**           | **类型** | **说明**                 | **必选** |
|-------------------|--------|------------------------|--------|
| point_action_list | PointAction[]  | 需要合并的多个PointAction对象数组 | 是      |

**返回值说明**

PointerMatrix对象，返回合并后描述多个手指操作的PointerMatrix对象

**使用示例**
```js
// 多指操作
let action1 = new PointAction()
  .down(new Point(500, 300))
  .move_to(newPoint(500, 1100))
let action2 = new PointAction()
  .down(new Point(500, 1600))
  .move_to(newPoint(500, 1150))
let combine_action = PointAction.mergeMultiPointAction([action1, action2])
await driver.injectMultiPointerAction(combine_action)
```
## KeyCode

**功能描述**

按键键盘码枚举值

**导入说明**

```js
import { KeyCode } from 'hypium-driver'
```

**常量说明**

键盘码常量说明参考

<https://developer.huawei.com/consumer/cn/doc/harmonyos-references-V5/js-apis-keycode-V5>

## Rect

**功能描述**

表示一个矩形区域

**导入说明**

```js
import { Rect } from 'hypium-driver'
```
**属性说明**

| **属性名称** | **属性类型** | **说明**    |
|----------|----------|-----------|
| left     | number   | 左边界对应的x坐标 |
| top      | number   | 上边界对应的y坐标 |
| right    | number   | 右边界对应x坐标  |
| bottom   | number   | 下边界对应的y坐标 |

## DeviceType

**功能描述**

设备类型枚举值

**导入说明**

```js
import { DeviceType } from 'hypium-driver'
```
**常量说明**

| 名称     | 类型     | 值      | 说明   |
|--------|--------|--------|------|
| PHONE  | string | phone  | 手机   |
| TABLET | string | tablet | 平板电脑 |

## MatchPattern

**功能描述**

对两个值进行匹配时的匹配策略枚举值

**导入说明**

```js
import { MatchPattern } from 'hypium-driver'
```
**常量说明**

| 名称          | 类型     | 值 | 说明   |
|-------------|--------|---|------|
| EQUALS      | number | 0 | 全等匹配 |
| STARTS_WITH | number | 1 | 前缀匹配 |
| ENDS_WITH   | number | 2 | 后缀匹配 |
| CONTAINS    | number | 3 | 包含匹配 |

## MouseButton

**功能描述**

鼠标按键枚举值

**导入说明**

```js
import { MouseButton } from 'hypium-driver'
```
**常量说明**

| 名称                  | 类型     | 值 | 说明   |
|---------------------|--------|---|------|
| MOUSE_BUTTON_LEFT   | number | 0 | 鼠标左键 |
| MOUSE_BUTTON_RIGHT  | number | 1 | 鼠标右键 |
| MOUSE_BUTTON_MIDDLE | number | 2 | 鼠标中键 |

##  DisplayRotation

**功能描述**

屏幕旋转方向枚举值

**导入说明**

```js
import { DisplayRotation } from 'hypium-driver'
```
**常量说明**

| 名称           | 类型     | 值 | 说明        |
|--------------|--------|---|-----------|
| ROTATION_0   | number | 0 | 默认显示方向    |
| ROTATION_90  | number | 1 | 顺时针旋转90度  |
| ROTATION_180 | number | 2 | 顺时针旋转180度 |
| ROTATION_270 | number | 3 | 顺时针旋转270度 |

##  ResizeDirection

**功能描述**

窗口尺寸调整时，调整方向枚举值

**导入说明**

```js
import { ResizeDirection } from 'hypium-driver'
```
**常量说明**

| 名称         | 类型     | 值 | 说明      |
|------------|--------|---|---------|
| LEFT       | number | 0 | 拖拽左边框调整 |
| RIGHT      | number | 1 | 拖拽右边框调整 |
| UP         | number | 2 | 拖拽上边框调整 |
| DOWN       | number | 3 | 拖拽下边框调整 |
| LEFT_UP    | number | 4 | 拖拽左上角调整 |
| LEFT_DOWN  | number | 5 | 拖拽左下角调整 |
| RIGHT_UP   | number | 6 | 拖拽右上角调整 |
| RIGHT_DOWN | number | 7 | 拖拽右下角调整 |

## LogEntry

**功能描述**

hilog日志记录内容。

**导入说明**

```js
import type { LogEntry } from "hypium-driver/lib/types";
```

**属性说明**

| 名称         | 类型     |  说明      |
|------------|--------|-----------|
| timestamp    | number | 日志记录的时间戳 |
| level	    | string | 日志记录的级别。当前均为ALL |
| message       | string | 日志记录按行输出的内容 |
