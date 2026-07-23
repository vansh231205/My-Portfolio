all=document.querySelector("*")

red=document.querySelector("#box1")
aura=document.querySelector("#box2")
orange=document.querySelector("#box3")
blue=document.querySelector("#box4")
h2=document.querySelector("h2")
h3=document.querySelector("h3")
box=document.querySelector(".boxes")
boxes=document.querySelectorAll(".box")
hs=document.querySelector(".highscore")

level=1
gseq=[]
start=false
highs=0


all.addEventListener("keypress",function(e){
    if(start== false){
        if( e.code== "Space"){
            h2.innerText=""
            start=true
            game()
            
        }
    }
})


function game(){
    for(i=1;i<=1;i++){
        r=Math.floor(Math.random()*4)
        btnFlash(boxes[r])
        gseq.push(boxes[r])
    }
    console.log(gseq)//Test
    
    box.addEventListener("click",userinp)
}

idx=0
function userinp(e){
    btnFlash(e.target)
    console.log(idx)

    if(e.target.classList.contains("boxes")){
        idx=idx
    }
    else if(e.target==gseq[idx] && e.target.classList.contains("box")){
        console.log(true)
        idx++
    }
    else{
        console.log(false)
        console.log(e.target)
        console.log(gseq[idx])
        h2.innerHTML=`<b style="color: red">Game Over!</b> Your score is <b style="color: blue">${level-1}</b>.<br>Press <b style="color: blueviolet">Space</b> to start again`
        all.style.backgroundColor="Red"
        box.style.backgroundColor="Red"
        highScore(level-1)
        setTimeout(()=>{all.style.backgroundColor="white"; box.style.backgroundColor="white"},100)
        gseq=[]
        idx=0
        level=1
        start=false
        h3.innerText=`Level ${level}`
        return
    }
    console.log(idx, gseq.length)
    if(idx==gseq.length && gseq.length!=0){
        level++
        h3.innerText=`Level ${level}`
        idx=0
        box.style.backgroundColor="lightgreen"
        setTimeout(()=>{box.style.backgroundColor="white"},100)
        setTimeout(game,500)
    }
        
}

function btnFlash(btn){
    col=btn.style.backgroundColor
    btn.style.backgroundColor="white"
    setTimeout(()=>{btn.style.backgroundColor=col},100)
}

function highScore(score){
    if(score>highs){
        highs=score
        hs.innerHTML=`Highest Score: <b style="color:blue">${highs}</b>`
    }
}