import { AggFunc, OrderBy, SheetConfigs } from "../SpreadSheetService";

// import { DataColumnPropertyMap } from "../../ui/canvas/services/WidgetService";
import workerpool from 'workerpool';

const selectVisibleCols = (visibleCols:string[],data:DataType[]):DataType[] => {
    const filteredData:DataType[] = [];
    data.forEach(row => {
        const filteredRow:DataType = {};
        visibleCols.forEach(visibleCol => filteredRow[visibleCol] = row[visibleCol]);
        if(Object.keys(filteredRow).length > 0) filteredData.push(filteredRow);
    })
    return filteredData;
}

export type DataType = {
    [id:string]:any
}

const aggregateBySum = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        if(index === 0) return;
        row[col]+= rows[index-1][col];
    })
    return rows;
}
const aggregateByAvg = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        if(index === 0) return;
        row[col]+= (rows[index-1][col]*index);
        row[col]/=(index+1);
    })
    return rows;
}
const aggregateByMin = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        if(index === 0) return;
        row[col] = Math.min(row[col],rows[index-1][col]);
    })
    return rows;
}
const aggregateByMax = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        if(index === 0) return;
        row[col] = Math.max(row[col],rows[index-1][col]);
    })
    return rows;
}
const aggregateByCount = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        row[col] = index+1;
    })
    return rows;
}
const aggregateByFirst = (rows:DataType[],col:string):DataType[] => {
    rows.forEach((row,index) => {
        row[col] = rows[0][col];
    })
    return rows;
}
const aggregateByLast = (rows:DataType[],col:string):DataType[] => {
    return rows;
}

const applyFunction = (rows:DataType[],col:string,func:string):DataType[] => {
    switch(func) {
        case "sum":
            return aggregateBySum(rows,col);
        case "avg":
            return aggregateByAvg(rows,col);
        case "min":
            return aggregateByMin(rows,col);
        case "max":
            return aggregateByMax(rows,col);
        case "count":
            return aggregateByCount(rows,col);
        case "first":
            return aggregateByFirst(rows,col);
        case "last":
            return aggregateByLast(rows,col);
        default: 
            return rows;
    }
}

const groupCols = (groupBy:string[],aggregateBy:AggFunc[],data:DataType[],currentIndex:number):DataType[] => {
    const treeNodes = new Map<string,DataType[]>();
    data.forEach(row => {
        const key = row[groupBy[currentIndex]];
        const node = treeNodes.get(key);
        if(!node) treeNodes.set(key,[row]);
        else node.push(row);
    });
    if(currentIndex + 1 === groupBy.length) {
        const finalResults:DataType[] = [];
        treeNodes.forEach((rows,groupKey) => {
            const aggregatedData:DataType = {[groupBy[currentIndex]]:groupKey};
            aggregateBy.forEach(([col,func]) => {
                const aggregatedRows:DataType[] = applyFunction(rows,col,func);
                aggregatedData[col] = aggregatedRows.slice(-1)[0][col];;
            });
            finalResults.push(aggregatedData);
        });
        return finalResults;
    }
    const result:DataType[] = [];
    treeNodes.forEach((rows,groupCol) => {
        const groupedRows = groupCols(groupBy,aggregateBy,rows,currentIndex+1);
        groupedRows.forEach(row => {
            result.push({[groupBy[currentIndex]]:groupCol,...row});
        })
    })
    return result;
}
const getKey = (columns:string[]):string => {
    return columns.reduce((curr:string,col:string,index) => {
        if(index + 1 === columns.length) return curr+col;
        return curr+col+"|";
    },"");
}
const getMap = (columns:string[]) => {
    return columns.reduce((prev:{[id:string]:boolean},curr:string) => {
        prev[curr] = true;
        return prev;
    },{});
}
const splitCols = (groupBy:string[],splitBy:string[],data:DataType[]):DataType[] => {
    // data is already grouped by
    const treeNodes = new Map<string,Map<string,DataType>>();
    let colGroups = new Set<string>();
    const newData:DataType[] = [];
    const groupColumns = getMap(groupBy);
    const splitColumns = getMap(splitBy);
    const nonGroupOrSplitCols:{[id:string]:boolean} = {};
    const getLastGroupCol = (row:DataType):string => {
        return groupBy.length === 0 ? "" : row[groupBy.slice(-1)[0]];
    }
    data.forEach((row,index) => {
        const vals:string[] = [];
        splitBy.forEach(key => {
            vals.push(row[key]);
        })
        const filteredData:DataType = {};
        Object.keys(row).forEach(key => {
            if(groupColumns[key] === undefined && splitColumns[key] === undefined) filteredData[key] = row[key],nonGroupOrSplitCols[key]=true;
        });
        
        const colKey = getKey(vals); // ABHI|GOLDJUN
        const groupKey = getLastGroupCol(row);
        const groupNode = treeNodes.get(groupKey);
        
        if(!groupNode) treeNodes.set(groupKey,new Map<string,DataType>([[colKey,filteredData]]));
        else groupNode.set(colKey,filteredData);
        colGroups.add(colKey);
    });
    if(groupBy.length === 0) {
        const node = treeNodes.get("");
        if(!node) return [];
        node.forEach((val,key) => {
            newData.push({[key]:val});
        })
        return newData;
    }
    const lastGroupCol = groupBy.slice(-1)[0];
    
    colGroups = new Set<string>(Array.from(colGroups).sort());

    for(let i=0;i<data.length;i++) {
        if(i>0 && data[i][lastGroupCol] === data[i-1][lastGroupCol]) continue;
        const newRow:DataType = {};
        Object.keys(groupColumns).forEach(group => {
            newRow[group] = data[i][group];
        });
        
        colGroups.forEach(val => {
            newRow[val] = {};
            Object.keys(nonGroupOrSplitCols).forEach(key => {
                newRow[val][key] = null;
            });
        })
        
        const groupNodes = treeNodes.get(data[i][lastGroupCol]);
        if(!groupNodes) continue;

        groupNodes.forEach((node,key) => {
            Object.keys(node).forEach(col => {
                newRow[key][col] = node[col];
            });
        });
        newData.push(newRow);
    }

    return newData;
}
function orderBy(orderBy:OrderBy[],data:DataType[]):DataType[] {
    if(!orderBy || orderBy.length === 0) return data;

    return data.sort((a,b):number => {
        for(let i=0;i<orderBy.length;i++) {
            const {colId, orderByType} = orderBy[i];
            if(a[colId] > b[colId]) return orderByType === "ASC" ? 1 : -1;
            else if(a[colId] < b[colId]) return orderByType === "ASC" ? -1 : 1;
        }
        return 0;
    })
}
export const transformData = (configs:SheetConfigs,data:DataType[]):Promise<DataType[]> => {
    return new Promise<DataType[]>((res,rej) => {
        let newData = selectVisibleCols(configs.visibleCols,data);
        const groupColumns = [...configs.groupBy];
        groupColumns.push(...configs.splitBy);
        if(configs.groupBy.length > 0)
            newData = groupCols(groupColumns,configs.functionCols,newData,0);
        newData = orderBy(configs.orderBy,newData);
        if(configs.splitBy.length > 0) 
            newData = splitCols(configs.groupBy,configs.splitBy,newData);
        res(newData);
    })
}

export type HeaderColsWidthType = {[id:string]:[string,number][]};

export function computeSplitHeaderCols(row:DataType):Promise<HeaderColsWidthType> {
    return new Promise<HeaderColsWidthType>((res,rej)=>{
        const splitHeaderCols = getHeaderCols(row);
        res(splitHeaderCols);
    });
}
function getHeaderCols(row:DataType):HeaderColsWidthType {
    // array of rows
    // it consist of key value pairs {"AH|SIL":[cols],"subbroker":"CHE"} ...
    const colHeaderKeys:string[] = [];
    let actualCols:string[] = [];
    const groupCols:string[] = [];
    Object.keys(row).forEach(key => {
        if(typeof row[key] !== "object") {
            groupCols.push(key);
            return;
        }
        colHeaderKeys.push(key);
        if(actualCols.length === 0) actualCols = Object.keys(row[key]);
    });


    const resultCols:HeaderColsWidthType = {};

    if(actualCols.length > 0) {
        getHeaderColsWidth(colHeaderKeys,resultCols,0,actualCols.length);
    } 
    const lastLevel = Object.keys(resultCols).length;
    resultCols[lastLevel] = [];
    const repeatTime = lastLevel === 0 ? 1: resultCols[lastLevel-1].length;
    for(let i=0;i<groupCols.length;i++) resultCols[lastLevel].push([groupCols[i],1]);
    for(let x=0;x<repeatTime;x++){
        if(lastLevel>0) for(let i=0;i<actualCols.length;i++) resultCols[lastLevel].push([actualCols[i],1]);
    }
    
    return resultCols;
    
}

function getHeaderColsWidth(headerCols:string[],resultCols:HeaderColsWidthType,currentIndex:number,endColsCount:number) {
    const freqMap = new Map<string,number>();
    const newHeaderCols = new Map<string,string[]>();
    
    headerCols.forEach((col,pos) => {
        const index = col.indexOf("|");
        const substr = index!==-1 ? col.slice(0,index): col; // "AH"
        const freq = freqMap.get(substr);
        if(freq === undefined) freqMap.set(substr,1);
        else freqMap.set(substr,freq+1); // only increment the count
        
        if(index === -1) return;

        const nextHeaderCol = newHeaderCols.get(substr); 
        if(nextHeaderCol === undefined) newHeaderCols.set(substr,[col.slice(index+1)]);
        else {
            nextHeaderCol.push(col.slice(index+1));
        }
    });
    const widthMap = new Map<string,number>();
    if(!resultCols[currentIndex]) resultCols[currentIndex] = [];
    freqMap.forEach((count,colId) => {
        const nextHeaderCols = newHeaderCols.get(colId);
        if(nextHeaderCols) {
            const nextLevelWidthMap = getHeaderColsWidth(nextHeaderCols,resultCols,currentIndex+1,endColsCount);
            const total = Array.from(nextLevelWidthMap.values()).reduce((prev,curr)=>prev+curr,0);
            resultCols[currentIndex].push([colId,total]);
        } else {
            resultCols[currentIndex].push([colId,endColsCount]);
            widthMap.set(colId,endColsCount);
        }
    });
    
    return widthMap;

}
export function getRowData(data:any[],headerCols:string[]):Promise<any[][]>{
    return new Promise<any[][]>((res,rej)=>{
        const rows:any[][] = [];            

        data.forEach(row => {
            const rowData:any[] = [];
            Object.keys(row).forEach(key => {
              if(typeof row[key] === "object") {
                rowData.push(...Object.values(row[key]));
              } else rowData.push(row[key]); 
            });
            rows.push(rowData);
          });

        //   for(let i=0;i<rows.length;i++){
        //     for(let j=0;j<rows[i].length;j++){
        //       if(typeof rows[i][j] === "number"){
        //         rows[i][j]=Number(rows[i][j].toFixed(colDefMap[headerCols[j]].decimalLocator ?? 0));
        //       }
        //     }
        //   }
        res(rows);
    })
}

workerpool.worker({
    transformData:transformData
})