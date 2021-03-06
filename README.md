# resource-meter

一个计算资源的性能评价器(a performance evaluator)，用于获取计算节点的实时性能信息，做出权重weight评价

[注意](#attention)

[GetStarted](#get-started)

[探针模式](#探针模式)

[评价模式](#评价模式)

[config.json配置](#configjson配置)

[评价算法 原理](#评价算法-原理)

[计划](#计划)

[misc](#misc)

[license](#license)

## Attention
* 访问不通或无性能信息的节点，其权重会设置为0，resource-meter默认不对其做剔除处理，如有需要请修改配置文件或自行处置。
* 为保持灵活，resource-meter默认不对结果进行排序，请根据自己需要对结果数据自行处理。
* 默认性能评价结果的权重等级为1-10级，可通过配置参数进行修改。
* resource-meter目前仅适用于Linux平台
* 基于Node，其他语言请使用各自平台的途径来调用本模块。或者只使用探针模式观察节点，而用自己的语言自行实现评价模式。


## Get Started
resource-meter支持两种模式配合使用：分别是评价模式和探针模式。评价模式推荐使用`编程方式`调用其暴漏的meter API，探针模式推荐直接执行命令`npm run probe`启动探针伺服器。

##探针模式##
> probe翻译为"探针". 探针是用来探测空间、服务器运行状况和脚本信息用的，探针可以实时查看服务器硬盘资源、内存占用、网卡流量、系统负载、服务器时间等信息。

resource-meter的评价模式底层其实通过http去获取该探针返回的信息，并进行性能权重的计算。

探针模式一般用来直接当做可执行程序使用，并部署在集群待测节点上面。所以直接clone本代码到您的本地，再执行相关指令即可. 方法如下：
```bash
git clone git@github.com:cuiyongjian/resource-meter.git
cd resource-meter && npm install
npm run probe
```
配置环境变量DEBUG可以在控制台输出探针调试信息，如DEBUG=resourceMeter:* npm run probe

探针启动后，您可以访问 http://节点IP/api 来查看节点的探针输出。也可以访问 http://节点IP/meter 来手工查看该节点实时计算出的权重(由于单节点的计算时其硬件配置没有可比性，所以该权重没有太大参考价值)。

探针信息的输出格式如下：
```
{
    cpu: {
        vcores: 1, //CPU核数目
        mhz: 2300,  //cpu核心频率
        loadavg: 0.52197265625, // 平均负载程度
        usage: 100 // cpu使用率
    },
    memery: {
        total: 500380, // 总内存量（KB）
        used: 486896, // 已用内存
        free: 13484, // 空闲内存
        shared: 144,  // 共享内存
        buffers: 2300, // 缓冲
        cached: 119740, // 缓存量
        actualFree: 135524, // 实际剩余
        percentUsed: 72.92, // 使用率
        comparePercentUsed: "97.31"
    },
    disk: {
        available: 8048078848, // 可用空间（Byte）
        free: 9121767424, // 空闲空间
        total: 21002579968 // 总空间
    },
}
```


当然，如果您想基于本探针进行二次开发，您可以require('resource-meter').probe，我们也暴露了如下接口：

* probe.info()  调用后返回当前机器的当前信息（信息内容基于config.json配置）
* probe.start(server)  传入一个http server实例，当probe探针启动后获取到第一次机器信息时，会自动启动该server。（端口基于config.json的配置）。您可以在server中自己处理http请求。

## 评价模式
使用方法：

先安装到项目中
```bash
npm install resource-meter --save
```
再将resource-meter引入到您的代码中：
```js
var resourceMeter = require('resource-meter')
```
按照上述方法将resource-meter作为API依赖，可以提供`集群内节点的性能评级`的功能，将性能评级融入到您的业务当中，就可以实现诸如`负载均衡`等特有的功能。

### 评价模式提供的API
**meter(inputHosts)**

inputHosts表示输入的资源池/节点列表。 该函数返回一个Promise，请在then中对result做相应的处理。input和result的格式请看下面。

### input/输入格式
resource-meter支持IP地址列表形式的输入:
```js
['192.168.1.100', '192.168.1.101']
```
或者带权重的IP列表形式(这里传入的权重值没有任何作用，最终会被resource-meter计算后重写)：
```js
[
    {value: '192.168.1.100', weight: 1},
    {value: '192.168.1.101', weight: 2}
]
```
示例：
```javascript
var resourceMeter = require('resource-meter');
var nodes = ['192.168.1.100', '192.168.1.101'];
var resultPromise = resourceMeter.meter(nodes);
resultPromise.then((resultNodes) = > {
    console.log(resultNodes);
})
```
resultNodes输出如下：
```
[
    {value: '192.168.1.100', weight: 1},
    {value: '192.168.1.101', weight: 2}
]
```
其中1和2是根据节点性能做出的权重评价。（默认为1-10级）

### metercenter
评价模式我们还提供了一个叫做metercenter的命令行工具，可以作为手工查看集群性能评价信息的工具来使用(评价计算在本地执行)。

首先进行全局安装
```
[sudo] npm install resource-meter --global
```

然后在shell中执行命令：
```
metercenter --hosts host1,host2,host3,host4 --port 8000
```
其中--port为可选参数(默认配置为8000，请根据您节点上部署的探针端口来确定)，--hosts为必填参数，表示集群内节点的地址，多个地址用逗号分隔。使用帮助：
```
metercenter -h
```


## config.json配置
通过本模块根目录下的config.json配置文件可以对resource-meter进行配置。他决定了`探针模式`所获取的性能参数以及`评价模式`所得结果的范围等等。

配置文件内容如下：
```
{
    disk: true,
    memery: true,
    cpu: true,
    gpu: true,
    level: '1-10',
    killzero: false,
    port: 8000
});
```
配置参数解释：

| 参数     | 默认值 | 类型  | 说明                                               |
|:-------:|:-----:|:-----:|--------------------------------------------------:|
| disk    | false  | bool  | 是否检测硬盘资源信息，开启后对性能有影响                |
| diskDir | '/'   | String  | 检测哪个目录，默认是根目录，例如设置hadoop的数据目录    |
| memery  | true  | bool  | 是否检测内存资源信息                                  |
| cpu     | true  | bool  | 是否检测cpu性能信息                                  |
| gpu     | false  | bool  | 是否检测gpu资源信息                                  |
| level   | '1-10'| String| 权重判定等级范围【本版本不可修改，因为没有实现！】          |
| killzero| false | bool  | 是否剔除宕机或无信息的节点                             |
| port    | 8000 | Number  | 性能探针的连接端口                                   |



## 计划
* 子进程异步执行;
* 二次开发扩展接口
* resource-meter基于mocha进行单元测试，使用如下命令：
`npm test`


## 评价算法 原理
实时资源负载比runtimeLoad（0%-100%）：
```
runtimeLoad = (loadAverage_Percentage*2 + cpuUsage_Percentage*1 + memUsage_Percentage + diskUsage_Percentage) / 6
```
loadAverage_Percentage表示CPU平均任务负载率，loadAvg它是操作系统给出的cpu忙绿程度的一个参数，为0-5的数值，本模块根据loadAvg实际效应---在[0-1]的时候变化影响较大，大于1的时候基本上处于高负载状态。将其[0,1]区间线性映射为[0%, 80%]的负载率，(1,5+)映射为(80%,100%]的负载率。

memUsage_Percentage是内存使用率，可通过 空闲内存/总内存 算出。

diskUsage_Percentage是磁盘使用率，可通过待测目录的 已用空间/总空间 算出。


实时资源负载的权重表示法runtimeWeight（0-10）：
```
runtimeWeight = Math.round(((-0.1 * runtimeLoad) + 10));
```
其中runtimeLoad表示实时负载比率

整体配置的权重因子physicalWeight（0-10）：
```
physicalWeight = (vcores/maxVcores*3 + totalMem/maxTotalMem*2 + hasGPU/1*2)/7 * 10
```

上述maxVcores,maxTotalMem表示集群内最大核数节点的vcores以及最大内存节点的totalMem. 若节点拥有GPU显卡的话，就认为其hasGPU为1，否则为0.8，用来拉高或拉低该节点的权重平均值(目前就用这么最简陋的算法...).

资源性能权重评价（0-10）：
```
FinalWeight = (runtimeWeight*3 + physicalWeight*1)/4
```

FinalWeight公式更倾向于认为实时的资源负载对性能具有更大的影响，所以其与机器配置的权重比为3：1


### 名词解释

> cpuUsage。这是指的执行探针时100毫秒时间内探测的CPU时间使用率，该参数对于表明CPU的资源利用情况具有指导意义。
node中缺少cpu使用率的算法，本模块参考该文章实现：<https://gist.github.com/bag-man/5570809>

目前感觉100ms时间过短，需要经过实践来修改一下 ^O^


>Load Average。这是 CPU的Load，它所包含的信息不是CPU的使用率状况，而是在一段时间内CPU正在处理以及等待CPU处理的进程数之和的统计信息，也就是CPU使用队列的长度的统计信息。

业界一般以如下指标来判断loadAverage参数对系统的影响，故本模块将CPU一分钟内的loadAverage的负载结果[0-5]映射为[0%-100%]作为cpu负载比。
* 0.7 < load < 1: 此时是不错的状态，如果进来更多的汽车，你的马路仍然可以应付。
* load = 1: 你的马路即将拥堵，而且没有更多的资源额外的任务，赶紧看看发生了什么吧。
* load > 5: 非常严重拥堵，我们的马路非常繁忙，每辆车都无法很快的运行

LoadAverage参考： <http://blog.chinaunix.net/uid-687654-id-2075858.html>, <http://pclfs1983.iteye.com/blog/654927>,<http://heipark.iteye.com/blog/1340384>

> 空闲内存。由于Linux上的缺陷，Node中对Linux空闲内存存在计算不准确的问题。本模块采用了如下方案获取真实的内存使用率.(这也导致本项目仅适用于Linux平台，请谨慎使用)

空闲内存参考：Based on [Determining free memory on Linux](http://blog.scoutapp.com/articles/2010/10/06/determining-free-memory-on-linux), Free memory = free + buffers + cache
本实现参考自：http://stackoverflow.com/questions/20578095/node-js-get-actual-memory-usage-as-a-percent
http://blog.chinaunix.net/uid-24709751-id-3564801.html


## misc
该模块为[awesome-balancer][AB]项目的动态负载均衡策略[DynamicWeightedEngine]提供了技术支撑。[awesome-balancer][AB]是一个包含了基于资源性能动态评价策略的负载均衡器。


## license
This software is free to use under the [MIT](http://opensource.org/licenses/MIT)  license. See the [LICENSE file][] for license text and copyright information.
[LICENSE file]: https://github.com/cuiyongjian/resource-meter/blob/master/LICENSE

Copyright © 2016 [cuiyongjian](http://blog.cuiyongjian.com) <cuiyongjian@outlook.com>

[AB]: https://github.com/cuiyongjian/awesome-balancer
