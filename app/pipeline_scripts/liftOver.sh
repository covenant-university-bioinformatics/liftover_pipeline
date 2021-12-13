#!/bin/bash
set -e
# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# echo an error message before exiting
trap 'echo "\"${last_command}\" command failed with exit code $?." >&2' EXIT

### This Script is to preprocess user input file.
## version 0.1
## 01/06/2021
## maintainer  Yagoub Adam
## maintainer Dare
## maintainer
## To run it ./liftOver.sh gwas_summary NCBI_build{38/36}

#development
bin_dir="/local/datasets"

#production
#bin_dir="/local/datasets/liftover"

##### Parameters
gwas_summary=$1;
outputdir=$2;     ## I think no need it as an input agrument
NCBI_build=$3;     # For liftOver convert from this build
liftOver_output=$outputdir/liftedOver.txt; #output file name

#### input file is preprocessed by Dare, such as
   ####1st column is chr #chr should be numbers
   ####2nd column is pos
   ####3rd column is rsid


#### creating liftOver input file, i.e. bed file
    ####1st column is chr (start by chr)
    ####2nd column is start pos
    ####3rd column is end pos (start pos +1)
    ####4th column is rsid
    ####5th column is chr (orginal numerical value )

#should be in input directory
awk '{print "chr"$1"\t"$2"\t"($2+1)"\t"$3"\t"$1}' $gwas_summary >  $outputdir/dbsnp.bed ## rearranges the columns
sed -i '1d' $outputdir/dbsnp.bed   #remove header


############ liftOver 38,

if [[ "$NCBI_build" == "38" ]]
then
## Do liftOver from NCBI 38 (hg38) to hg 19 (NCBI 37)
## We safe liftOver binnary file in the root folder
#append to outputdir output-lifted.bed unlifted.bed
echo "Here"
echo $NCBI_build
$bin_dir/liftOver $outputdir/dbsnp.bed $bin_dir/hg38ToHg19.over.chain.gz $outputdir/output-lifted.bed $outputdir/unlifted.bed # we report both outputs

fi

if [[ "$NCBI_build" == "36" ]]
then
## Do liftOver  NCBI 36 (hg18) to hg 19 (NCBI 37)
#change liftoverdata to bin_dir
echo "Here 2"
echo $NCBI_build
#append output dir
$bin_dir/liftOver $outputdir/dbsnp.bed $bin_dir/hg18ToHg19.over.chain.gz $outputdir/output-lifted.bed $outputdir/unlifted.bed # we report both outputs

fi

#### Merge liftOver output with user input file
    #### Merge two files based on rsid
    ##### makes 2nd column as pos
    ##### makes 3rd column as rsid
    ##### makes 1st column as chr   (orginal numerical value)
    ##### Remove unneeded files
#append output dir output-lifted.bed
#append input dir $gwas_summary
#output dir temp_final.txt
join  -1 4 -2 3 <(sort -k 4 $outputdir/output-lifted.bed) <( sort  -k3 $gwas_summary) | awk '{$2=$3;$3=$1;$1=$5; $4=$5=$6=$7=""; print $0}' | sed 's/ \+/ /g'> $outputdir/temp_final.txt


## Retreive header
#input folder $gwas_summary
#output folder $liftOver_output
head -n 1 $gwas_summary > $liftOver_output
cat $outputdir/temp_final.txt >> $liftOver_output

#output folder
rm $outputdir/temp_final.txt;
