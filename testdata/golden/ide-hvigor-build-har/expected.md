# 构建HAR

更新时间：2026-08-29 09:41:34

来源：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-hvigor-build-har

构建模式：DevEco Studio默认提供debug和release两种构建模式，同时支持开发者自定义构建模式。

产物格式：构建出的HAR包产物分为包含源码的HAR、包含js中间码的HAR以及包含字节码的HAR三种产物格式。

从DevEco Studio NEXT Beta1（5.0.3.800）版本开始，默认构建字节码HAR，用于提升发布产物的安全性。


## 使用约束

HAR自身的构建不建议引用本地模块，可能导致其他模块依赖该HAR包时安装失败，如果安装失败，需要在工程级oh-package.json5中配置[overrides](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-oh-package-json5#zh-cn_topic_0000001792256137_overrides)。



## 创建模块
1. 新建工程时选择API 10及以上的Stage模型，工程创建完成后，新建“Static Library”模块。模块创建方法可参考[在工程中添加Module](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-add-new-module)。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/48/v3/rrg2i1dDTOCKKt16Mpb97A/zh-cn_image_0000002701823236.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=ACD84DAF6942390606302EB0F8AF97740D0A26071CCDCBACEF5E46BB278234C3)

2. 编写代码。

  
```ArkTS
library  // HAR根目录
  ├─libs  // 存放用户自定义引用的Native库，一般为.so文件
  └─src
  │   └─main
  │     ├─cpp
  │     │  ├─types  // 定义Native API对外暴露的接口  
  │     │  │  └─liblibrary  
  │     │  │      ├─index.d.ts
  │     │  │      └─oh-package.json5 
  │     │  ├─CMakeLists.txt  // CMake配置文件  
  │     │  └─napi_init.cpp  // C++源码文件
  │     └─ets  // ArkTS源码目录
  │     │  └─components
  │     │     └─MainPage.ets
  │     ├─resources  // 资源目录，用于存放资源文件，如图片、多媒体、字符串等  
  │     └─module.json5  // 模块配置文件，包含当前HAR的配置信息  
  ├─build-profile.json5  // Hvigor编译构建所需的配置文件，包含编译选项
  ├─hvigorfile.ts  // Hvigor构建脚本文件，包含构建当前模块的插件、自定义任务等
  ├─Index.ets  // HAR的入口文件，一般作为出口定义HAR对外提供的函数、组件等   
<strong>  └─oh-package.json5</strong>  // HAR的描述文件，定义HAR的基本信息、依赖项等
```

3. 在oh-package.json5中“main”字段定义导出文件入口。若不设置“main”字段，默认以当前目录下Index.ets为入口文件，依据.ets>.ts>.js的顺序依次检索。以将ets/components/MainPage.ets文件设置为入口文件为例：

  
```ArkTS
{
  ...
  <span style="color: rgb(102,14,122);">"main"</span>: <span style="color: rgb(0,128,0);">"./src/main/ets/components/MainPage.ets"</span>,
  ...
}
```




## 字节码HAR

默认产物是包含字节码的HAR包，其中包含abc字节码、资源文件、配置文件、readme、changelog声明文件、license证书文件，提升发布到ohpm中心仓产物的安全性。

字节码HAR包中包含的是编译后的abc字节码，当字节码HAR被其他应用模块(HAP/HSP)依赖时，执行应用模块的编译构建，不需要再对依赖的HAR进行语法检查和编译等操作，相比源码HAR，可以有效提升应用模块的编译构建效率，提高安全性，降低代码泄露的风险。

> [!NOTE]
> 由于构建字节码HAR需要生成二进制的格式，所以单独构建字节码HAR会比构建非字节码HAR耗时更多。




### 收益

 - 字节码HAR可以降低代码泄露的风险，增加反编译获取代码逻辑的难度。


 - 采用ArkTS/TS语言开发的字节码HAR，被HAP/HSP集成时，可以减少语法检查、转换的耗时，提高构建性能。
 - 字节码HAR可以减少编译时node的进程占用，有效降低内存占用。
 - 通过其他代码生成工具生成的js语言HAR包，编译构建成字节码HAR后，被HAP/HSP集成时，可以减少编译阶段处理的文件和代码数量，降低内存，提高构建性能。




### 使用场景

从功能上来说所有的源码HAR包都可以按照任意顺序切换成字节码HAR。但是由于字节码HAR编译和集成的特点，按照推荐场景或顺序来逐步切换字节码HAR可能会获得比较好的性能、内存收益。以下场景中推荐切换使用字节码HAR：

 - 适用于SDK厂商对外提供SDK，以及高安全的场景，字节码HAR可以降低源码泄露的风险。
 - 采用multi-repo的开发模式，在被主工程合并集成时，所有依赖的HAR均可以发布成字节码HAR，从而提高主HAP的构建效率。
 - 采用mono-repo的开发模式，工程中含有单个代码文件较大，或通过代码生成工具生成的代码量较大的ArkTS/TS/JS 的二方、三方SDK(HAR包)时，可考虑将这些HAR包构建成字节码HAR。
 - 对内存要求较高的场景，可以通过切换字节码HAR，降低内存的占用。
 - 通过ArkTS/TS/JS编写的HAR，且在依赖链条中处于较为底层的叶子节点，含有较少的源码依赖时，切换为字节码HAR会有较好的收益。




### 约束条件

 - 字节码HAR使用的依赖需要配置在本模块的oh-package.json5的dependencies或dynamicDependencies中，如果不配置，后续字节码HAR被集成时可能会出现运行时异常。如果出现异常，部分场景可通过在hvigor-config.json5中配置ohos.byteCodeHar.integratedOptimization后重新编译，具体请参考[编译行为差异说明](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-hvigor-dependencies#section957371853712)。
 - 字节码HAR的oh-package.json5中配置的依赖名和依赖包的包名（即包内oh-package.json5中的name）需要保持一致。
 - 依赖字节码HAR包时，该工程的build-profile.json5中的[useNormalizedOHMUrl](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-hvigor-build-profile-app#section13181758123312)必须设置为true。
 - HAP/HSP/HAR依赖字节码HAR包时，HAP/HSP/HAR的oh-package.json5中配置的依赖名和字节码HAR包的oh-package.json5中的name需要保持一致。
 - HAP/HSP/HAR代码中import使用字节码HAR包时，`import xxx from 'yyy'`的依赖名yyy要和本模块oh-package.json5中配置的依赖名保持一致（包括大小写）。
 - 依赖字节码HAR包时，字节码HAR的compatibleSdkVersion不能大于工程的compatibleSdkVersion。




### 操作步骤
1. 将工程级build-profile.json5的useNormalizedOHMUrl设置为true。

  
> [!NOTE]
> 从DevEco Studio NEXT Beta1（5.0.3.800）版本开始，工程级build-profile.json5中useNormalizedOHMUrl字段默认为true，byteCodeHar缺省默认值为true，无需执行步骤1和2。


  
```json
{
  <span style="color: rgb(102,14,122);">"app"</span>: {
    "products": [
      {
         "buildOption": {
           "strictMode": {
             "useNormalizedOHMUrl": true
           }
         }
      }
    ]
  }
}
```

2. 在HAR模块的build-profile.json5中，将byteCodeHar设置为true。

  
```json
{
  <span style="color: rgb(102,14,122);">"buildOption"</span>: {
    "arkOptions": {
      "byteCodeHar": true
    }
  }
}
```

3. 点击DevEco Studio右上角图标![icon](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/20/v3/z9wnutyWSZ2wd6vChHwiqA/zh-cn_image_0000002731382523.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=E3165D4955883DE4A050BEFBD4E286A49C4C3CC4BF12E881B5C698C0CE7039F1)，选择**Build Mode，**默认为**&lt;Default&gt;**模式：在编译App时使用release模式，编译HAP/HSP/HAR时使用debug模式。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/b9/v3/lSURMEXLQ6qaaMs7QOwFPg/zh-cn_image_0000002701663318.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=3387FD9A54439527EF329B03C20B0FA7117E866834E9FB04EE332B7B55C30985)

4. （可选）在编译模式为release时，为保护代码资产，建议开启混淆，在模块级build-profile.json5文件的release的buildOptionSet配置中，将obfuscation/ruleOptions下的enable字段设置为true。混淆相关能力和具体规则请参考[代码混淆](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-build-obfuscation)。

  
```json
{
  <span style="color: rgb(135,16,148);">"apiType"</span>: <span style="color: rgb(6,125,23);">"stageMode"</span>,
  <span style="color: rgb(135,16,148);">"buildOption"</span>: {
  },
  <span style="color: rgb(135,16,148);">"buildOptionSet"</span>: [
    {
      <span style="color: rgb(135,16,148);">"name"</span>: <span style="color: rgb(6,125,23);">"release"</span>,
      <span style="color: rgb(135,16,148);">"arkOptions"</span>: {
        // 混淆相关参数
        <span style="color: rgb(135,16,148);">"obfuscation"</span>: {
          <span style="color: rgb(135,16,148);">"ruleOptions"</span>: {
            // true表示进行混淆，false表示不进行混淆。5.0.3.600及以上版本默认为false
            <span style="color: rgb(135,16,148);">"enable"</span>: <span style="color: rgb(0,51,179);">true</span>,
            // 混淆规则文件
            <span style="color: rgb(135,16,148);">"files"</span>: [
              <span style="color: rgb(6,125,23);">"./obfuscation-rules.txt"</span>
            ]
          },
          // consumerFiles中指定的混淆配置文件会在构建依赖这个library的工程或library时被应用
          <span style="color: rgb(135,16,148);">"consumerFiles"</span>: [
            <span style="color: rgb(6,125,23);">"./consumer-rules.txt"</span>
          ]
        }
      },
    },
  ],
  <span style="color: rgb(135,16,148);">"targets"</span>: [
    {
      <span style="color: rgb(135,16,148);">"name"</span>: <span style="color: rgb(6,125,23);">"default"</span>
    }
  ]
}
```

5. （可选）如果开发者希望自定义打包到HAR产物中的文件，可在HAR模块的build-profile.json5文件中，配置include或exclude字段，支持glob语法。

  
```json
<span style="color: rgb(135,16,148);">"buildOption"</span>: {
  <span style="color: rgb(135,16,148);">"packingOptions"</span>: {
    <span style="color: rgb(135,16,148);">"asset"</span>: {
      <span style="color: rgb(135,16,148);">"include"</span>: [<span style="color: rgb(6,125,23);">"./src/router.json5"</span>,<span style="color: rgb(6,125,23);">"router.json5"</span>],    // 配置打包到HAR产物中的文件
      <span style="color: rgb(135,16,148);">"exclude"</span>: [<span style="color: rgb(6,125,23);">"./config/*"</span>]     // 配置不打包到HAR产物中的文件
    }
  }
}
```

> [!NOTE]
> 配置include字段时，以下目录不生效，即不会被打包到产物中：node_modules、oh_modules、.preview、build、.cxx、.test。 配置exclude字段时，以下文件不生效，默认会打包：oh-package.json5。

6. 选中HAR模块的根目录，点击**Build > Make Module '<module-name>'**启动构建。

  
> [!NOTE]
> 若修改了HAR模块级oh-package.json5文件的version字段，请先执行 Build > Clean Project 操作，再重新进行Build全量构建。


  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/8c/v3/WH2AqL2rRh6pmSHUFUl4pg/zh-cn_image_0000002731542499.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=56EC542A3DC2645421322F26F056FBD3D22311EACCA64FBDD6BC81D838585751)


  构建完成后，build目录下生成HAR包产物。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/46/v3/srbYrINjRWCiNC1EtV_HSQ/zh-cn_image_0000002701663296.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=77DF4CB06A5CB38C1EE4ADD049DE017D7AE8A8378C6772CAE9C146057820C153)


  HAR包产物解压后，结构如下：

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/49/v3/KkAnpQeuSqiJdMyYyUbPhA/zh-cn_image_0000002731382529.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=22B999146F4AC28F47FB9CCAD6F5E5B99F26EB6711F6E906A139FE434D6E343E)




## 源码HAR



### 以debug模式构建

产物是包含源码的HAR包，其中包含源码、资源文件以及配置文件等，方便开发者进行本地调测，不包含build、node_modules、oh_modules、.cxx、.preview、.hvigor、.gitignore、.ohpmignore、.gitignore/.ohpmignore中配置的文件、cpp工程的CMakeLists.txt。

> [!NOTE]
> 源码HAR包中包含源代码，请谨慎分发，避免造成源代码泄露。 如果是native工程，以debug模式构建的native产物中不包含调试信息和符号表，如需调试，请参考 三方源码调试 。 从5.0.3.403版本开始，不再建议使用相对路径跨模块引用代码文件，若历史工程存在此场景的跨模块引用，会出现warning告警，请尝试将该文件移至本模块内，再重新进行编译。 从5.0.3.403版本开始，以debug/release模式构建HAR的流程使用相同的语法校验规则，若历史工程出现ArkTS语法报错，请按照报错信息修改代码，以符合ArkTS语言规范。

1. 在HAR模块的build-profile.json5中，将byteCodeHar设置为false。

  
```json
{
  <span style="color: rgb(102,14,122);">"buildOption"</span>: {
    "arkOptions": {
      "byteCodeHar": false
    }
  }
}
```

> [!NOTE]
> 使用DevEco Studio NEXT Beta1（5.0.3.800）之前的版本，模块级build-profile.json5的byteCodeHar字段的缺省默认值为false，无需执行本步骤。

2. 点击DevEco Studio右上角图标![icon](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/4d/v3/JlsnkP-QSaugvh6fePe6Nw/zh-cn_image_0000002731542495.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=4C771B7A88B4FFD2AFC05A8F2D578028A03FDB10FD8ADCCFAB3CCD751EFDC073)，**Build Mode**选择**debug。**默认为**&lt;Default&gt;**模式：在编译App时使用release模式，编译HAP/HSP/HAR时使用debug模式。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/54/v3/17QHftvbTfeot6t-RzKnVQ/zh-cn_image_0000002731542511.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=E1D5DDCD0A34DFC46D516DD9E1450256C437A4E72EA6490A467AFE7DDA884D4A)

3. （可选）若部分工程源文件无需构建到HAR包中，可在模块目录下新建.ohpmignore文件，或者在模块目录下的.gitignore文件中，配置打包时要忽略的文件，.ohpmignore文件中支持正则表达式写法，.gitignore文件中支持glob语法。DevEco Studio构建时将过滤掉.ohpmignore或.gitignore文件中所包含的文件/文件夹。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/1c/v3/pfnIBezlT8SsNQDIfwGZQw/zh-cn_image_0000002731542513.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=8ECF3E357859BFA4BDCF5CC6DA4A0673C19279CFEA6EA01FB344EEFFBB965570)

4. （可选）如果开发者希望自定义打包到HAR产物中的文件，可在HAR模块的build-profile.json5文件中，配置include或exclude字段，支持glob语法。配置include或exclude字段后，.gitignore和.ohpmignore文件将不再生效。

  
```json
<span style="color: rgb(135,16,148);">"buildOption"</span>: {
  <span style="color: rgb(135,16,148);">"packingOptions"</span>: {
    <span style="color: rgb(135,16,148);">"asset"</span>: {
      <span style="color: rgb(135,16,148);">"include"</span>: [<span style="color: rgb(6,125,23);">"./src/router.json5"</span>,<span style="color: rgb(6,125,23);">"router.json5"</span>],    // 配置打包到HAR产物中的文件
      <span style="color: rgb(135,16,148);">"exclude"</span>: [<span style="color: rgb(6,125,23);">"./config/*"</span>]     // 配置不打包到HAR产物中的文件
    }
  }
}
```

> [!NOTE]
> 配置include字段时，以下目录不生效，即不会被打包到产物中：node_modules、oh_modules、.preview、build、.cxx、.test。 配置exclude字段时，以下文件不生效，默认会打包：oh-package.json5。

5. 选中HAR模块的根目录，点击**Build > Make Module '<module-name>'**启动构建。

  
> [!NOTE]
> 若修改了HAR模块级oh-package.json5文件的version字段，请先执行 Build > Clean Project 操作，再重新进行Build全量构建。


  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/81/v3/QBiCMKJ6SYW74HWvGSYaHg/zh-cn_image_0000002701663312.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=43DD2C6CD6623AE34E126DB3694A2EC6EE79B02AE6D727A717BBC1F6DA43DE8F)


  构建完成后，build目录下生成HAR包产物。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/f0/v3/Pf2TU_-mSj2NJ9mRUQJ57w/zh-cn_image_0000002731382521.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=8B2E58185F241A7E20B2D03D54A5A6D60B26DBDB9E2BCCBCEDD68841D33BD44B)


  HAR包产物解压后，结构如下：

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/77/v3/cgwgTIlmQHqZNNmKFUjFCg/zh-cn_image_0000002731542505.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=983C89C52424537D5688B3F108F192F40EF753495E6902A7DE3419B3BA487CC0)




### 以release模式构建

从DevEco Studio NEXT Developer Beta3（5.0.3.600）版本开始，默认不开启混淆，构建产物和debug模式相同，请参考[以debug模式构建](#section197792874110)。

为保护代码资产，建议开启混淆，开启后，构建产物是包含js中间码的HAR包，其中包含源码混淆后生成的js中间码文件、资源文件、配置文件、readme、changelog声明文件、license证书文件，用于发布到ohpm中心仓。
1. 在HAR模块的build-profile.json5中，将byteCodeHar设置为false。

  
```json
{
  <span style="color: rgb(102,14,122);">"buildOption"</span>: {
    "arkOptions": {
      "byteCodeHar": false
    }
  }
}
```

> [!NOTE]
> 使用DevEco Studio NEXT Beta1（5.0.3.800）之前的版本，模块级build-profile.json5的byteCodeHar字段的缺省默认值为false，无需执行本步骤。

2. 点击DevEco Studio右上角图标![icon](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/da/v3/O4d94NGaR7uiPlPhLkPH_g/zh-cn_image_0000002701823240.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=5315E95082EF4FD18D35F41E4DD0097B86D661549AEE63485493A0BD3FC792EE)，**Build Mode**中选择**release。**默认为**&lt;Default&gt;**模式：在编译App时使用release模式，编译HAP/HSP/HAR时使用debug模式。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/bf/v3/gxN7CYbMTUeabL5_lTRHRg/zh-cn_image_0000002701663322.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=BA056EE9EB2A63AF569EE1BA1FC940998E7EBD9117109E6E72C40CD13814F80F)

3. 在[编译模式](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-hvigor-compilation-options-customizing-guide#section192461528194916)为release时，为保护代码资产，建议开启混淆，在模块级build-profile.json5文件的release的buildOptionSet配置中，将obfuscation/ruleOptions下的enable字段设置为true。混淆相关能力和具体规则请参考[代码混淆](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-build-obfuscation)。

  
```json
{
  <span style="color: rgb(135,16,148);">"apiType"</span>: <span style="color: rgb(6,125,23);">"stageMode"</span>,
  <span style="color: rgb(135,16,148);">"buildOption"</span>: {
  },
  <span style="color: rgb(135,16,148);">"buildOptionSet"</span>: [
    {
      <span style="color: rgb(135,16,148);">"name"</span>: <span style="color: rgb(6,125,23);">"release"</span>,
      <span style="color: rgb(135,16,148);">"arkOptions"</span>: {
        // 混淆相关参数
        <span style="color: rgb(135,16,148);">"obfuscation"</span>: {
          <span style="color: rgb(135,16,148);">"ruleOptions"</span>: {
            // true表示进行混淆，false表示不进行混淆。5.0.3.600及以上版本默认为false
            <span style="color: rgb(135,16,148);">"enable"</span>: <span style="color: rgb(0,51,179);">true</span>,
            // 混淆规则文件
            <span style="color: rgb(135,16,148);">"files"</span>: [
              <span style="color: rgb(6,125,23);">"./obfuscation-rules.txt"</span>
            ]
          },
          // consumerFiles中指定的混淆配置文件会在构建依赖这个library的工程或library时被应用
          <span style="color: rgb(135,16,148);">"consumerFiles"</span>: [
            <span style="color: rgb(6,125,23);">"./consumer-rules.txt"</span>
          ]
        }
      },
    },
  ],
  <span style="color: rgb(135,16,148);">"targets"</span>: [
    {
      <span style="color: rgb(135,16,148);">"name"</span>: <span style="color: rgb(6,125,23);">"default"</span>
    }
  ]
}
```

4. （可选）如果开发者希望自定义打包到HAR产物中的文件，可在HAR模块的build-profile.json5文件中，配置include或exclude字段，支持glob语法。

  
```json
<span style="color: rgb(135,16,148);">"buildOption"</span>: {
  <span style="color: rgb(135,16,148);">"packingOptions"</span>: {
    <span style="color: rgb(135,16,148);">"asset"</span>: {
      <span style="color: rgb(135,16,148);">"include"</span>: [<span style="color: rgb(6,125,23);">"./src/router.json5"</span>,<span style="color: rgb(6,125,23);">"router.json5"</span>],    // 配置打包到HAR产物中的文件
      <span style="color: rgb(135,16,148);">"exclude"</span>: [<span style="color: rgb(6,125,23);">"./config/*"</span>]     // 配置不打包到HAR产物中的文件
    }
  }
}
```

> [!NOTE]
> 配置include字段时，以下目录不生效，即不会被打包到产物中：node_modules、oh_modules、.preview、build、.cxx、.test。 配置exclude字段时，以下文件不生效，默认会打包：oh-package.json5。

5. 选中HAR模块的根目录，点击**Build > Make Module '<module-name>'**启动构建。

  
> [!NOTE]
> 若修改了HAR模块级oh-package.json5文件的version字段，请先执行 Build > Clean Project 操作，再重新进行Build全量构建。


  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/fa/v3/avzb07YlTCaCk_yT60NLLw/zh-cn_image_0000002701823220.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=192921CFDC13BEE088572567EFDC450D658110C32CB0E5AC79CC834651EE9762)


  构建完成后，build目录下生成HAR包产物。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/b7/v3/CW4N13oDSN6EUUxq8hg56g/zh-cn_image_0000002701663314.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=34EF303B41178BE42BFAF31EB965895F815FB0D5B7A3A7D1B0A9339F10C26BF3)


  HAR包产物解压后，结构如下：

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/e3/v3/sGsHY-RTT-OVJMOXJkTCiQ/zh-cn_image_0000002731542515.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=1A6DD927385954F89764035A11B3A117DC9F3EA9F76A856C91A1ECBB2DFC32ED)




## 对HAR进行签名

DevEco Studio在构建HAR流程的基础上，支持对HAR进行签名。签名后的HAR包后续可用于接入生态市场，接入流程请参考[SDK类商品接入说明](https://developer.huawei.com/consumer/cn/doc/start/dev-mall-marketplace-sp-sdkservice-access-explain-0000001866499490)。

> [!NOTE]
> 1. 该能力只在Compatible SDK 5.0.0(12)及以上版本的SDK中支持。 2. 该能力需开启Hvigor的Daemon能力，请确保当前工程开启了Daemon，打开 File > Settings （macOS为 DevEco Studio > Preferences/Settings） > Build, Execution, Deployment > Build Tools > Hvigor ，勾选字段 Enable the Daemon for tasks 。

1. 在hvigor-config.json5中，开启构建签名HAR开关：

  
```text
{
  <span style="color: rgb(102,14,122);">"properties"</span>: {
    "ohos.sign.har": true
  }
}
```

2. 配置工程签名信息，配置流程请参考[配置签名信息](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-publish-app#section793484619307)。
3. 选中HAR模块的根目录，点击**Build > Make Module '<module-name>'**启动构建。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/ae/v3/sjm0qvTQRySjxkFlI5N3GQ/zh-cn_image_0000002701823226.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=D63B4CE31914A087017D433C63896CFC12E52B9D484FB2BAC3CA134D75826990)


  构建完成后，build目录下生成签名HAR包产物。

  
![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/f8/v3/tNAJhjsHT2244Zr-WFi6fg/zh-cn_image_0000002701823222.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=EB59E1D683B6DD974C8DBEFB594755A759F8E58ED26A804CDEF79F1B0BA57879)




## 多HAR合并打包

SDK厂商在对外发布SDK（HAR包）时，有时需要隐藏内部实现细节及依赖，仅暴露必要的接口。从26.0.0版本开始，Hvigor支持将字节码HAR及其所有依赖合并打包，生成一个无外部依赖、可直接使用的独立HAR包。



### 配置方法

在HAR模块的build-profile.json5文件中，配置bundle字段可以实现多HAR合并打包的能力。bundle下包含bundledDeclare和bundledAllDependencies两个字段，是[bundledDependencies](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-hvigor-build-profile#section8368152412552)的增强版。使用时，不能同时配置bundle和bundledDependencies。

```json
// HAR模块build-profile.json5
"buildOption": {
  "arkOptions": {
    "bundle": {
      "bundledDeclare": true,
      "bundledAllDependencies": true
    }
  }
}
```



> [!NOTE] 说明
> bundledDeclare开启后，产物HAR中，默认只会生成oh-package.json5中main字段和oh-exports字段所指向源码文件的声明文件。如未配置oh-exports字段，则只生成main字段源码的声明文件。


| 字段名称 | 类型 | 可选/必选 | 含义 |
| --- | --- | --- | --- |
| bundledDeclare | 布尔值 | 可选 | 构建字节码HAR或HSP时，是否生成bundle化的声明文件。 true：生成。 false（缺省默认值）：不生成。 |
| bundledAllDependencies | 布尔值 | 可选 | 构建字节码HAR时，是否将所有依赖打包到产物中。 true：打包。 false（缺省默认值）：不打包。 |


> [!NOTE]
> bundledAllDependencies会将dependencies和dynamicDependencies所有依赖都打包，而bundledDependencies只会将dependencies和dynamicDependencies依赖的源码HAR打包。 bundledAllDependencies为true，devDependencies中配置的HAR包的资源/so不会打包。 bundledAllDependencies为true，bundledDeclare也必须配置为true。 bundledAllDependencies为true，且hvigor-config.json5的ohos.byteCodeHar.integratedOptimization为true时，工程级oh-package.json5中的本地模块依赖的资源/so不会打包。 bundledAllDependencies为true，依赖中不支持配置HSP类型的依赖。 bundledAllDependencies为true，若依赖没有被调用，则最终会被裁剪，不会打包到最终的HAR中。




### 使用效果说明

关于bundledDeclare字段的使用效果，示例代码如下：

```json
// oh-package.json5
"dependencies": {
  "shop": "1.0.0"
}
```


```ArkTS
// Index.ets
export { live } from './src/main/ets/components/Live';
export { shop } from 'shop';
```


 - bundledDeclare不配置，或配置为false时，编译的字节码HAR或者编译HSP生成的HAR中的声明文件如下：       
```ArkTS
// Index.d.ets
export { live } from './src/main/ets/components/Live';
export { shop } from 'shop';
```

 - 配置bundledDeclare为true后编译：       
```ArkTS
// Index.d.ets
export declare function live(game: string): void;
export declare function shop(product: string): void;
```





关于bundledAllDependencies字段的使用效果，示例代码如下，以live模块为例：      
```json
// oh-package.json5
"dependencies": {
  "shop": "1.0.0"
}
```



```ArkTS
// Index.ets
export { live } from './src/main/ets/components/Live';
export { shop } from 'shop';
```


将bundledAllDependencies配置为true（此时bundledDeclare也必须配置为true）编译，除了Index.d.ets会被bundle合并外，依赖的shop源代码文件也会被合并到live的modules.abc中，资源文件/so文件也会合并打包到live包中。


![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/44/v3/cfK-v3d1QHCPsR4HYV6R2w/zh-cn_image_0000002701823232.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=6F62B51ED5AFD25230721C4FA7E315518404BF7801E5DAFD5C464E75BECEB9A1)


配置bundledAllDependencies为true后，HAR包的oh-package.json5中的dependencies也会被消除：


![](https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_scene_100_1/dd/v3/gOsX6edSQ0ehTuao1-TkSA/zh-cn_image_0000002731542497.png?HW-CC-KV=V1&HW-CC-Date=20260907T063408Z&HW-CC-Expire=86400&HW-CC-Sign=660BC73097A452E1A3FE5CA2C948A40BB2DA5593E340D45DA244AF6132D550FC)
