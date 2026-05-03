// src/components/NewsTab.js
import React,{useState} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,ActivityIndicator,Linking} from 'react-native';
import {NewsService,NEWS_CATEGORIES} from '../services/NewsService';
import {GeminiService} from '../services/GeminiService';
const C={acc:'#6C63FF',accg:'#8B83FF',accd:'#3D3880',txt:'#F0F0FF',sub:'#9AA0BC',dim:'#4A5070',surf:'#14161F',bdr:'#1F2235',blue:'#3B82F6',cyan:'#06B6D4',warn:'#F59E0B',ok:'#22C55E'};
const ACCS=[C.acc,C.cyan,C.warn,C.ok,C.blue,'#EC4899'];

function NewsCard({article,accent}){
  const [expanded,setExpanded]=useState(false);const [summary,setSummary]=useState('');
  const toggle=async()=>{if(!expanded&&!summary){const s=await GeminiService.summarizeArticle(article).catch(()=>article.description||'');setSummary(s);}setExpanded(e=>!e);};
  return(
    <TouchableOpacity style={s.newsCard} onPress={toggle} onLongPress={()=>article.url&&Linking.openURL(article.url)} activeOpacity={0.85}>
      <View style={[s.newsBar,{backgroundColor:accent}]}/>
      <View style={s.newsInner}>
        <View style={s.newsMeta}>
          <Text style={[s.newsSrc,{color:accent}]}>{article.source}</Text>
          <Text style={s.newsDot}>·</Text>
          <Text style={s.newsTime}>{NewsService.timeAgo(article.publishedAt)}</Text>
          <Text style={[s.newsExp,{marginLeft:'auto'}]}>{expanded?'\u25b2':'\u25bc'}</Text>
        </View>
        <Text style={s.newsTitle} numberOfLines={expanded?0:2}>{article.title}</Text>
        {expanded&&<View style={s.newsExpanded}>
          {summary?<Text style={s.newsSumTxt}>{summary}</Text>:<ActivityIndicator size="small" color={C.acc} style={{alignSelf:'flex-start'}}/>}
          {article.url?<TouchableOpacity onPress={()=>Linking.openURL(article.url)} style={s.readMore}><Text style={s.readMoreTxt}>Read full article →</Text></TouchableOpacity>:null}
        </View>}
      </View>
    </TouchableOpacity>
  );
}

export function NewsTab({data,isLoading}){
  const [cat,setCat]=useState('general');
  const articles=(data&&data[cat])||[];
  return(
    <View style={s.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{gap:8,paddingRight:16}}>
        {NEWS_CATEGORIES.map(c=>(
          <TouchableOpacity key={c.id} style={[s.chip,cat===c.id&&s.chipActive]} onPress={()=>setCat(c.id)} activeOpacity={0.8}>
            <Text style={s.chipEmoji}>{c.emoji}</Text>
            <Text style={[s.chipLbl,cat===c.id&&{color:'#fff'}]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:24}}>
        {isLoading&&!articles.length?<View style={s.center}><ActivityIndicator color={C.acc}/></View>
        :!articles.length?<View style={s.center}><Text style={s.dimTxt}>No articles. Pull to refresh.</Text></View>
        :articles.map((a,i)=><NewsCard key={i} article={a} accent={ACCS[i%ACCS.length]}/>)}
      </ScrollView>
    </View>
  );
}
const s=StyleSheet.create({
  root:{flex:1},catScroll:{marginBottom:12},center:{alignItems:'center',paddingTop:60},dimTxt:{color:'#4A5070',fontSize:14},
  chip:{flexDirection:'row',alignItems:'center',backgroundColor:C.surf,borderRadius:20,paddingHorizontal:13,paddingVertical:8,gap:5,borderWidth:1,borderColor:C.bdr},
  chipActive:{backgroundColor:C.acc,borderColor:C.acc},chipEmoji:{fontSize:13},chipLbl:{fontSize:12,fontWeight:'600',color:C.sub},
  newsCard:{flexDirection:'row',backgroundColor:C.surf,borderRadius:14,marginBottom:9,overflow:'hidden',borderWidth:1,borderColor:C.bdr},
  newsBar:{width:3},newsInner:{flex:1,padding:13},
  newsMeta:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:5},
  newsSrc:{fontSize:11,fontWeight:'700'},newsDot:{fontSize:11,color:C.dim},newsTime:{fontSize:11,color:C.dim},newsExp:{fontSize:10,color:C.dim},
  newsTitle:{fontSize:14,fontWeight:'600',color:C.txt,lineHeight:20},
  newsExpanded:{marginTop:9},newsSumTxt:{fontSize:13,color:C.sub,lineHeight:19},
  readMore:{marginTop:9,alignSelf:'flex-start',backgroundColor:'#3D3880',borderRadius:8,paddingHorizontal:12,paddingVertical:5},
  readMoreTxt:{fontSize:12,color:'#8B83FF',fontWeight:'600'},
});
