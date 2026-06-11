## 安装说明

### 自动安装

当前目录下在需要安装包的python环境中执行以下命令安装。

```bash
# 安装基础包，通过-g执行安装组合模式。
python install.py -g hypium_basic


可以执行以下命令查看目标安装包版本

```bash
python install.py --show-version
```

执行以下命令查看待安装的包

```bash
python install.py -l
```

### 手动安装

#### 安装基础包

使用pip install安装目录下的四个pip安装包
由于存在依赖关系，请按照以下顺序安装
xdevice, xdevice-devicetest, xdevice-ohos, hypium
安装命令:

```bash
pip install xdevice-6.1.0.210.tar.gz
pip install xdevice-devicetest-6.1.0.210.whl
pip install xdevice-ohos-6.1.0.210.whl
pip install hypium-6.1.0.210.tar.gz
```
    