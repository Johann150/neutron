#I am using an OS which is not listed in the releases

In that case, there will be a bit of a difficult part for you. You will have to do some command line things. If you are afraid of that, maybe ask someone with more experience. I am not responsible for anything that you do on or to your computer because of this.

Firstly you will have to install [NodeJS](https://nodejs.org/) if that is not already installed on your computer.

*If there is no NodeJS support for your OS, I am sorry to tell you that I cannot help you with your OS.*

After having installed NodeJS, you have to download this repository. You can do that using `git clone` on your command line if you know how to do that or you can just download a zip file from [here](https://github.com/Johann150/neutron/archive/master.zip). This should be the newest version of the repository.

If you have now finished those steps, the next and last step should be building the electron app. This is done on the *command line*.

```
npm install
npm run dist
```

The first command will install any required 3rd party packages. This includes e.g. Electron.

The second command will then create an installer or a portable running file (portable only for windows).

When the two commands are both successful, there should be a file or directory created.
